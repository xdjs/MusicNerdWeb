import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistLinkEdit } from '../requestArtistLinkEdit';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it.each(['directEditLink', 'removeArtistData'] as const)('sends %s to the configured API with bearer authorization and the displayed identity', async endpoint => {
  const body = { artistId: 'a1', siteName: 'deezer', expectedValue: '87797542', ...(endpoint === 'directEditLink' ? { action: 'clear' as const } : {}) };
  const response = await requestArtistLinkEdit(endpoint, body);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith(`https://api-preview.test/api/${endpoint}`, {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('preserves an explicitly null expected value without converting omission into null', async () => {
  await requestArtistLinkEdit('directEditLink', { artistId: 'a1', action: 'clear', siteName: 'deezer', expectedValue: null });
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toHaveProperty('expectedValue', null);
  await requestArtistLinkEdit('directEditLink', { artistId: 'a1', action: 'set', url: 'https://instagram.com/example' });
  expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body)).not.toHaveProperty('expectedValue');
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistLinkEdit('removeArtistData', { artistId: 'a1', siteName: 'deezer', expectedValue: '87797542' })).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
it('returns the API conflict response unchanged for the caller to show', async () => {
  const conflict = { ok: false, status: 409, json: async () => ({ status: 'error', error: 'Reload before disconnecting' }) };
  (fetch as jest.Mock).mockResolvedValue(conflict);
  expect(await requestArtistLinkEdit('directEditLink', { artistId: 'a1', action: 'clear', siteName: 'deezer', expectedValue: 'old' })).toBe(conflict);
});
