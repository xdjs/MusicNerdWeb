import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistLinkOrder } from '../requestArtistLinkOrder';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const body = { artistId: 'a1', section: 'links' as const, order: ['deezer', 'spotify'] };
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('puts the order to the API with bearer authorization and no cookies', async () => {
  expect((await requestArtistLinkOrder(body)).ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/link-order', {
    method: 'PUT', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('does not send the order when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistLinkOrder(body)).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
