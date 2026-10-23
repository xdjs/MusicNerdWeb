import { getAccessToken } from '@privy-io/react-auth';
import { requestAdminApi } from '../requestAdminApi';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('admin-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('sends a GET to the configured API with the admin bearer token and no cookies', async () => {
  const response = await requestAdminApi('/api/admin/artist-data');
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/admin/artist-data', {
    headers: { Authorization: 'Bearer admin-token' }, credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('sends a JSON body with its method', async () => {
  await requestAdminApi('/api/admin/mcp-keys', { method: 'POST', body: { label: 'Bot' } });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/admin/mcp-keys', {
    method: 'POST', headers: { Authorization: 'Bearer admin-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'Bot' }), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('does not call the API without a Privy token', async () => {
  token.mockResolvedValue(null);
  await expect(requestAdminApi('/api/admin/agent-work')).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
