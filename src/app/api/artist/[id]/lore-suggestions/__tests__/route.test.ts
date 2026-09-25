// @ts-nocheck
import { POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { insertVaultSource } from '@/server/utils/queries/dashboardQueries';

jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({
  insertVaultSource: jest.fn(),
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
});

it('lets a signed-in visitor suggest a source for artist review', async () => {
  const response = await call(' pitchfork.com/features/bike-lane ');
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({ success: true, message: 'Submitted for artist review.' });
  expect(insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({
    artistId, url: 'https://pitchfork.com/features/bike-lane', status: 'pending',
  }));
});

it('requires a signed-in account', async () => {
  (requireAuth as jest.Mock).mockResolvedValue({ authenticated: false, response: Response.json({ error: 'Not authenticated' }, { status: 401 }) });
  expect((await call('https://pitchfork.com/a')).status).toBe(401);
  expect(insertVaultSource).not.toHaveBeenCalled();
});

it.each(['javascript:alert(1)', 'http://127.0.0.1/private', 'file:///etc/passwd'])(
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
