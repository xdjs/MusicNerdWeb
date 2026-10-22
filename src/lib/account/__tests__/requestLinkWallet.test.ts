import { getAccessToken } from '@privy-io/react-auth';
import { requestLinkWallet } from '../requestLinkWallet';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const wallet = '0x1234567890abcdef1234567890abcdef12345678';
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('posts the wallet to the API with bearer authorization and no cookies', async () => {
  const response = await requestLinkWallet(wallet);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/auth/link-wallet', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: wallet }), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('does not call the API when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestLinkWallet(wallet)).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
it('returns an API error response unchanged for the caller to show', async () => {
  const conflict = { ok: false, status: 409, json: async () => ({ status: 'error', error: 'This wallet is already linked to another account' }) };
  (fetch as jest.Mock).mockResolvedValue(conflict);
  expect(await requestLinkWallet(wallet)).toBe(conflict);
});
