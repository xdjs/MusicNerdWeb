import { getAccessToken } from '@privy-io/react-auth';
import { requestContributions } from '../requestContributions';

jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('reads the signed-in contributor data from the API with bearer authorization and no cookies', async () => {
  const signal = new AbortController().signal;
  const response = await requestContributions('/api/selfEdits?page=2', signal);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/selfEdits?page=2', {
    headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', cache: 'no-store', signal,
  });
});
it('sends no authorization when Privy has no token, so the API answers as signed out', async () => {
  token.mockResolvedValue(null);
  await requestContributions('/api/ugcCount');
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/ugcCount', {
    headers: {}, credentials: 'omit', cache: 'no-store', signal: undefined,
  });
});
