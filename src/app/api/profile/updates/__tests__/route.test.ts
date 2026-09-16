/** @jest-environment node */
import { GET } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
jest.mock('@/lib/auth-helpers', () => ({requireAuth: jest.fn()}));
jest.mock('@/server/db/drizzle', () => ({db: {select: jest.fn()}}));
jest.mock('@/server/utils/queries/artistLatestQueries', () => ({getArtistLatest: jest.fn()}));
if (typeof Response.json !== 'function') Response.json = (data, init) => new Response(JSON.stringify(data), {...init, headers: {'Content-Type': 'application/json', ...init?.headers}});
const limit = jest.fn();
function query(rows: unknown[]) {
  const chain = {from: jest.fn(), innerJoin: jest.fn(), where: jest.fn(), orderBy: jest.fn(), limit, offset: jest.fn(), then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve)};
  for (const method of [chain.from, chain.innerJoin, chain.where, chain.orderBy, chain.limit, chain.offset]) method.mockReturnValue(chain);
  return chain;
}
const request = (query = '', account = 'a') => new Request(`https://test/api/profile/updates${query}`, {headers: {'X-Profile-Account': account}});
beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({authenticated: true, userId: 'a'});
});
it('rejects account switches without reading artists or providers', async () => {
  expect((await GET(request('', 'b'))).status).toBe(409);
  expect(db.select).not.toHaveBeenCalled();
  expect(getArtistLatest).not.toHaveBeenCalled();
});
it('bounds each window and filters before the two-update artist cap', async () => {
  const artists = Array.from({length: 6}, (_, i) => ({artist: {id: `artist-${i}`, name: `Artist ${i}`}}));
  const rows = query(artists);
  const totals = query([{total: 100}]);
  // Each query owns a limit function; only the artist query uses it.
  rows.limit = jest.fn().mockReturnValue(rows);
  (db.select as jest.Mock).mockReturnValueOnce(rows).mockReturnValueOnce(totals);
  let concurrent = 0, maximum = 0;
  (getArtistLatest as jest.Mock).mockImplementation(async () => {
    concurrent += 1; maximum = Math.max(maximum, concurrent);
    await new Promise(resolve => setTimeout(resolve, 1));
    concurrent -= 1;
    return {unavailable: false, items: [
      {id: 'post', kind: 'instagram', date: '2026-09-15'},
      {id: 'answer', kind: 'interview', date: '2026-09-14'},
      {id: 'release', kind: 'release', date: '2026-08'},
    ]};
  });
  const response = await GET(request('?kind=Release'));
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(rows.limit).toHaveBeenCalledWith(6);
  expect(getArtistLatest).toHaveBeenCalledTimes(6);
  expect(maximum).toBeLessThanOrEqual(2);
  expect(data).toMatchObject({userId: 'a', checked: 6, next: 6});
  expect(data.items).toHaveLength(6);
  expect(data.items.every((item: {kind: string; artistId: string}) => item.kind === 'release' && item.artistId)).toBe(true);
});
