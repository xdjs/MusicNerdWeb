// @ts-nocheck
import { POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { getVaultSourceUrlsByArtistId } from '@/server/utils/queries/getVaultSourceUrlsByArtistId';

jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({
  insertVaultSource: jest.fn(),
}));
jest.mock('@/server/utils/queries/getVaultSourceUrlsByArtistId', () => ({
  getVaultSourceUrlsByArtistId: jest.fn(),
}));
jest.mock('@/server/utils/fetchPageContent', () => ({
  isUnsafeUrl: jest.requireActual('@/server/utils/fetchPageContent').isUnsafeUrl,
}));

if (!('json' in Response)) {
  Response.json = (data, init) => new Response(JSON.stringify(data), {
    ...init, headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

const artistId = '8b3d9163-a184-468e-8772-cdd73f260835';
const call = (url: string) => POST(
  new Request(`https://musicnerd.xyz/api/artist/${artistId}/lore-suggestions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
  }),
  { params: Promise.resolve({ id: artistId }) },
);

beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: true, userId: 'visitor-1' });
  (insertVaultSource as jest.Mock).mockResolvedValue({ id: 'source-1' });
  (getVaultSourceUrlsByArtistId as jest.Mock).mockResolvedValue([]);
});

it('lets a signed-in visitor suggest a source for artist review', async () => {
  const response = await call(' pitchfork.com/features/bike-lane ');
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, message: 'Submitted for artist review.' });
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({
    artistId, url: 'https://pitchfork.com/features/bike-lane', status: 'pending',
  }));
});

it('strips fragments and serializes the URL before duplicate detection', async () => {
  expect((await call('HTTPS://PITCHFORK.COM:443/features/bike-lane#bio')).status).toBe(201);
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({
    url: 'https://pitchfork.com/features/bike-lane',
  }));
});

it('detects a previously stored URL with a fragment as the same source', async () => {
  (getVaultSourceUrlsByArtistId as jest.Mock).mockResolvedValue([
    'https://pitchfork.com/features/bike-lane#bio',
  ]);
  expect((await call('https://pitchfork.com/features/bike-lane')).status).toBe(409);
  expect(insertVaultSource).not.toHaveBeenCalled();
});

it('requires a signed-in account', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: false, response: Response.json({ error: 'Not authenticated' }, { status: 401 }) });
  expect((await call('https://pitchfork.com/a')).status).toBe(401);
  expect(insertVaultSource).not.toHaveBeenCalled();
});

it.each(['javascript:alert(1)', 'http://127.0.0.1/private', 'http://127.0.0.2/private', 'http://8.8.8.8/page', 'file:///etc/passwd'])(
  'rejects unsafe URL %s', async url => {
    expect((await call(url)).status).toBe(400);
    expect(insertVaultSource).not.toHaveBeenCalled();
  },
);

it('reports an existing source without creating another', async () => {
  (insertVaultSource as jest.Mock).mockResolvedValue(undefined);
  const response = await call('https://pitchfork.com/a');
  expect(response.status).toBe(409);
});
