import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistSources } from '../requestArtistSources';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const respond = (status: number, json: unknown) => (global.fetch as jest.Mock).mockResolvedValue({ ok: status < 400, status, json: async () => json });
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn(); });

it('POSTs a new source to the artist with bearer authorization and returns it', async () => {
  respond(201, { status: 'ok', source: { id: 's1' }, warning: 'w' });
  expect(await requestArtistSources('a1', { method: 'POST', body: { url: 'https://x.test' } })).toEqual({ success: true, source: { id: 's1' }, warning: 'w', count: undefined });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/knowledge/sources', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://x.test' }), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('DELETEs one source without a body', async () => {
  respond(200, { status: 'ok' });
  expect((await requestArtistSources('a1', { method: 'DELETE', sourceId: 's1' })).success).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/knowledge/sources/s1', {
    method: 'DELETE', headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('returns the API error message', async () => {
  respond(409, { status: 'error', error: 'This source has already been added' });
  expect(await requestArtistSources('a1', { method: 'POST', body: {} })).toEqual({ success: false, error: 'This source has already been added' });
});
it('fails without a request when Privy has no token, or when the network fails', async () => {
  token.mockResolvedValueOnce(null);
  expect((await requestArtistSources('a1', { method: 'DELETE', sourceId: 's1' })).error).toMatch(/sign in/);
  expect(fetch).not.toHaveBeenCalled();
  (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
  expect(await requestArtistSources('a1', { method: 'DELETE', sourceId: 's1' })).toEqual({ success: false, error: 'Please try again' });
});
