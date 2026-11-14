import { db } from '@/server/db/drizzle';
import { queueUnitSync } from '@/server/utils/units/queueUnitSync';
import { setSourcePublication } from '../setSourcePublication';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));
jest.mock('@/server/utils/units/queueUnitSync', () => ({ queueUnitSync: jest.fn() }));
jest.mock('@/server/utils/activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn().mockResolvedValue('event') }));

const input = { sourceId: 'source', publication: 'public' as const, expectedUpdatedAt: '2026-01-01T00:00:00Z' };
const expected = { artistId: 'artist', sourceId: 'source', publication: 'public' };
let committed = false;
function run(current: string) {
  const execute = jest.fn().mockResolvedValueOnce([{ is_admin: true }]).mockResolvedValueOnce([{ artist_id: 'artist' }])
    .mockResolvedValueOnce([]).mockResolvedValueOnce([{ publication: current }]).mockResolvedValue([{ id: 'source' }]);
  db.transaction = jest.fn(async fn => { const out = await fn({ execute } as never) as never; committed = true; return out; });
}
beforeEach(() => {
  jest.clearAllMocks();
  committed = false;
  (queueUnitSync as jest.Mock).mockImplementation(async () => { expect(committed).toBe(true); return true; });
});

it('queues a unit sync for the artist after a publication change commits', async () => {
  run('inherit');
  expect(await setSourcePublication('admin', input)).toEqual(expected);
  expect(queueUnitSync).toHaveBeenCalledWith('artist');
});
it('does not queue when the decision is unchanged', async () => {
  run('public');
  await setSourcePublication('admin', input);
  expect(queueUnitSync).not.toHaveBeenCalled();
});
it('returns the same result when the hook fails', async () => {
  run('inherit');
  (queueUnitSync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
  expect(await setSourcePublication('admin', input)).toEqual(expected);
});
