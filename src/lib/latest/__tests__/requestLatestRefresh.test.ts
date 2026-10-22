import { getAccessToken } from '@privy-io/react-auth';
import { requestLatestRefresh } from '../requestLatestRefresh';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it.each(['GET', 'POST'] as const)('sends %s to the configured API with bearer authorization and no cookies', async method => {
  const signal = new AbortController().signal;
  const response = await requestLatestRefresh('artist-1', method, signal);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist-1/latest-refresh', {
    method, headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', cache: 'no-store', signal,
  });
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestLatestRefresh('artist-1', 'POST')).rejects.toThrow('Sign in to update Latest.');
  expect(fetch).not.toHaveBeenCalled();
});
it('returns an API error response unchanged for the caller to show', async () => {
  const denied = { ok: false, status: 403, json: async () => ({ status: 'error', error: 'Only this artist or an admin can update Latest.' }) };
  (fetch as jest.Mock).mockResolvedValue(denied);
  expect(await requestLatestRefresh('artist-1', 'POST')).toBe(denied);
});
