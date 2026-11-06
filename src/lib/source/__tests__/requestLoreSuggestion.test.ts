import { getAccessToken } from '@privy-io/react-auth';
import { requestLoreSuggestion } from '../requestLoreSuggestion';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('POSTs the source URL to the API with bearer authorization', async () => {
  await requestLoreSuggestion('a1', 'https://example.com/interview');
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/lore-suggestions', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com/interview' }), credentials: 'omit', cache: 'no-store',
  });
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestLoreSuggestion('a1', 'https://example.com')).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
