import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistLinkSuggestions } from '../requestArtistLinkSuggestions';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('loads the first page from the API with bearer authorization, uncached', async () => {
  const signal = new AbortController().signal;
  await requestArtistLinkSuggestions('artist 1', 0, signal);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist%201/link-suggestions', {
    headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', redirect: 'error', cache: 'no-store', signal,
  });
});
it('asks for a later page by offset', async () => {
  await requestArtistLinkSuggestions('a1', 100);
  expect((fetch as jest.Mock).mock.calls[0][0]).toBe('https://api-preview.test/api/artist/a1/link-suggestions?offset=100');
});
it('does not call the API when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistLinkSuggestions('a1', 0)).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
