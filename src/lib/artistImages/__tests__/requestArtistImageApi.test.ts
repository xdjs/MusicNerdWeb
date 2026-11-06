import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistImageApi } from '../requestArtistImageApi';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('sends a JSON write to the configured API with bearer authorization and no cookies', async () => {
  const body = JSON.stringify({ artistId: 'a1', imageUrl: '/photo.jpg', y: 40 });
  const response = await requestArtistImageApi('/api/artist/header-position', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/header-position', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer private-token' },
    body, credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('sends a multipart upload without forcing a content type, so the browser sets the boundary', async () => {
  const form = new FormData();
  await requestArtistImageApi('/api/artist/profile-image', { method: 'POST', body: form });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/profile-image', {
    method: 'POST', headers: { Authorization: 'Bearer private-token' }, body: form, credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('passes a query and an abort signal through for the photo choices read', async () => {
  const signal = new AbortController().signal;
  await requestArtistImageApi('/api/artist/photo-choice?artistId=a%201', { signal });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/photo-choice?artistId=a%201', expect.objectContaining({ signal, headers: { Authorization: 'Bearer private-token' } }));
});
it('does not call the API when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistImageApi('/api/artist/photo-choice?artistId=a1', {})).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
it('returns the API error response unchanged for the caller to show', async () => {
  const conflict = { ok: false, status: 409, json: async () => ({ status: 'error', error: 'The profile changed.' }) };
  (fetch as jest.Mock).mockResolvedValue(conflict);
  expect(await requestArtistImageApi('/api/artist/photo-choice', { method: 'PATCH' })).toBe(conflict);
});
