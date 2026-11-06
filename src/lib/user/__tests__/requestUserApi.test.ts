import { getAccessToken } from '@privy-io/react-auth';
import { requestUserApi } from '../requestUserApi';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('calls the API route with the Privy token and without the Web session cookie', async () => {
  const signal = new AbortController().signal;
  await requestUserApi('/api/profile/summary', { headers: { 'X-Profile-Account': 'a' }, signal });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/profile/summary', {
    headers: { 'X-Profile-Account': 'a', Authorization: 'Bearer private-token' }, signal, credentials: 'omit', cache: 'no-store',
  });
});
it('keeps the method and body', async () => {
  await requestUserApi('/api/user/a', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{"username":"x"}' });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/user/a', expect.objectContaining({
    method: 'PATCH', body: '{"username":"x"}', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer private-token' },
  }));
});
it('sends no Authorization header when Privy has no token, so the API answers as anonymous', async () => {
  token.mockResolvedValue(null);
  await requestUserApi('/api/user/has-claim');
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/user/has-claim', { headers: {}, credentials: 'omit', cache: 'no-store' });
});
