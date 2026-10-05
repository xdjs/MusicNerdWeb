// @ts-nocheck
import { POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';
import { getVaultSourceUrlsByArtistId } from '@/server/utils/queries/getVaultSourceUrlsByArtistId';
import { getUserById } from '@/server/utils/queries/userQueries';
import { queueLoreRefresh } from '@/server/utils/queries/loreRefresh';
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';

jest.mock('@/server/utils/queries/userQueries', () => ({ getUserById: jest.fn() }));
jest.mock('@/server/utils/queries/loreRefresh', () => ({ queueLoreRefresh: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn() }));

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
const call = (url: string, extra = {}) => POST(
  new Request(`https://musicnerd.xyz/api/artist/${artistId}/lore-suggestions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, ...extra }),
  }),
  { params: Promise.resolve({ id: artistId }) },
);

beforeEach(() => {
  jest.clearAllMocks();
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: true, userId: 'visitor-1' });
  (insertVaultSource as jest.Mock).mockImplementation(async data => ({ id: 'source-1', ...data }));
  (getVaultSourceUrlsByArtistId as jest.Mock).mockResolvedValue([]);
  (getUserById as jest.Mock).mockResolvedValue({ id: 'visitor-1', isAdmin: false, isWhiteListed: false });
  (getLoreClaimGeneration as jest.Mock).mockResolvedValue('claim-1');
  (queueLoreRefresh as jest.Mock).mockResolvedValue(true);
});

it('lets a signed-in visitor suggest a source for artist review', async () => {
  const response = await call(' pitchfork.com/features/bike-lane ');
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ success: true, status: 'pending' });
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({
    artistId, url: 'https://pitchfork.com/features/bike-lane', status: 'pending',
  }), undefined, { userId: 'visitor-1', trigger: 'visitor_suggestion' });
  expect(queueLoreRefresh).not.toHaveBeenCalled();
});

it.each([
  { isAdmin: false, isWhiteListed: true },
  { isAdmin: true, isWhiteListed: false },
])('approves new Lore for the current trusted role %j', async role => {
  getUserById.mockResolvedValue({ id: 'visitor-1', ...role });
  const response = await call('https://example.com/interview');
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ success: true, status: 'approved' });
  expect(getUserById).toHaveBeenCalledWith('visitor-1');
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }),
    undefined, { userId: 'visitor-1', trigger: 'trusted_submission' });
  expect(queueLoreRefresh).toHaveBeenCalledWith(artistId, 'claim-1', { userId: 'visitor-1', trigger: 'source_submission' });
});

it('also approves trusted submissions on unclaimed artists', async () => {
  getUserById.mockResolvedValue({ isWhiteListed: true });
  getLoreClaimGeneration.mockResolvedValue(null);
  expect((await call('https://example.com/interview')).status).toBe(201);
  expect(queueLoreRefresh).toHaveBeenCalledWith(artistId, null, expect.any(Object));
});

it('ignores stale session roles and approval flags supplied by the client', async () => {
  requireAuth.mockResolvedValue({ authenticated: true, userId: 'visitor-1', session: { user: { isAdmin: true, isWhiteListed: true } } });
  const response = await call('https://example.com/interview', { status: 'approved', autoApprove: true, isAdmin: true, isWhiteListed: true, userId: 'admin' });
  expect(await response.json()).toMatchObject({ status: 'pending' });
  expect(queueLoreRefresh).not.toHaveBeenCalled();
});

it('does not save anything when the current role lookup fails', async () => {
  getUserById.mockRejectedValueOnce(new Error('database unavailable'));
  expect((await call('https://example.com/interview')).status).toBe(500);
  expect(insertVaultSource).not.toHaveBeenCalled();
});

it('reports a saved approval truthfully if the derived Lore refresh cannot queue', async () => {
  getUserById.mockResolvedValue({ isWhiteListed: true });
  queueLoreRefresh.mockRejectedValueOnce(new Error('queue unavailable'));
  const response = await call('https://example.com/interview');
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ success: true, status: 'approved', warning: expect.stringMatching(/saved/i) });
  expect(insertVaultSource).toHaveBeenCalledTimes(1);
});

it('strips fragments and serializes the URL before duplicate detection', async () => {
  expect((await call('HTTPS://PITCHFORK.COM:443/features/bike-lane#bio')).status).toBe(201);
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({
    url: 'https://pitchfork.com/features/bike-lane',
  }), undefined, { userId: 'visitor-1', trigger: 'visitor_suggestion' });
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
  getUserById.mockResolvedValue({ isWhiteListed: true });
  (insertVaultSource as jest.Mock).mockResolvedValue(undefined);
  const response = await call('https://pitchfork.com/a');
  expect(response.status).toBe(409);
  expect(queueLoreRefresh).not.toHaveBeenCalled();
});
