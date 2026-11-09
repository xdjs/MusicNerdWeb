import { getAccessToken } from '@privy-io/react-auth';
import { requestMusicNerdApi } from '../requestMusicNerdApi';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const respond = (status: number, body: unknown) =>
  (global.fetch as jest.Mock).mockResolvedValue({ ok: status < 400, status, json: async () => body });

beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn(); });

it('GETs with bearer authorization and returns the body as success', async () => {
  respond(200, { status: 'ok', versions: [] });
  expect(await requestMusicNerdApi('/api/artistBio/a1/versions')).toEqual({ success: true, status: 'ok', versions: [] });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artistBio/a1/versions', {
    method: 'GET', headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', cache: 'no-store',
  });
});

it('sends a JSON body', async () => {
  respond(200, { status: 'ok' });
  await requestMusicNerdApi('/api/artistBio/a1/pin', { method: 'PUT', body: { versionId: 'v1' } });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artistBio/a1/pin', {
    method: 'PUT', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId: 'v1' }), credentials: 'omit', cache: 'no-store',
  });
});

it("returns the API's error message on failure", async () => {
  respond(409, { status: 'error', error: 'Cannot delete a pinned bio version' });
  expect(await requestMusicNerdApi('/x', { method: 'DELETE' })).toEqual({ success: false, error: 'Cannot delete a pinned bio version' });
});

it('fails without a request when there is no token, and on a network error', async () => {
  token.mockResolvedValue(null);
  expect(await requestMusicNerdApi('/x')).toEqual({ success: false, error: 'Please sign in again.' });
  expect(fetch).not.toHaveBeenCalled();
  token.mockResolvedValue('private-token');
  (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
  expect(await requestMusicNerdApi('/x')).toEqual({ success: false, error: 'Network error. Please try again.' });
});
