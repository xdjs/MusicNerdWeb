import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistClaim } from '../requestArtistClaim';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const respond = (status: number, body: unknown) => (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('user-token'); global.fetch = jest.fn(); });

it('posts the claim with the bearer token and no cookies, and returns the code', async () => {
  respond(200, { status: 'ok', referenceCode: 'MN-ABCD' });
  expect(await requestArtistClaim('a 1')).toEqual({ success: true, referenceCode: 'MN-ABCD' });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a%201/claim', {
    method: 'POST', headers: { Authorization: 'Bearer user-token' }, credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('reports an already-claimed profile', async () => {
  respond(409, { status: 'error', error: 'This artist profile has already been claimed' });
  expect(await requestArtistClaim('a1')).toEqual({ success: false, alreadyClaimed: true, error: 'This artist profile has already been claimed' });
});
it('passes other API errors through', async () => {
  respond(404, { status: 'error', error: 'Artist not found' });
  expect(await requestArtistClaim('a1')).toEqual({ success: false, error: 'Artist not found' });
});
it('asks the user to sign in again without a token, without calling the API', async () => {
  token.mockResolvedValue(null);
  expect(await requestArtistClaim('a1')).toEqual({ success: false, error: 'Please sign in again to claim this profile.' });
  expect(fetch).not.toHaveBeenCalled();
});
