import { getAccessToken } from '@privy-io/react-auth';
import { requestVaultUpload } from '../requestVaultUpload';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it.each([
  ['sign', { artistId: 'a1', name: 'notes.pdf', type: 'application/pdf', size: 3 }],
  ['complete', { ticket: 'signed-ticket' }],
] as const)('sends %s to the configured API with bearer authorization', async (step, body) => {
  const response = await requestVaultUpload(step, body);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith(`https://api-preview.test/api/vault/upload/${step}`, {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestVaultUpload('complete', { ticket: 't' })).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
it('returns the API error response unchanged for the caller to show', async () => {
  const failed = { ok: false, status: 503, json: async () => ({ status: 'error', error: 'Retry this file', retryCompletion: true }) };
  (fetch as jest.Mock).mockResolvedValue(failed);
  expect(await requestVaultUpload('complete', { ticket: 't' })).toBe(failed);
});
