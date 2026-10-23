import { getAccessToken } from '@privy-io/react-auth';
import { requestDirectoryDiscovery } from '../requestDirectoryDiscovery';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('GETs the discovery status from the API with bearer authorization and the caller signal', async () => {
  const signal = new AbortController().signal;
  await requestDirectoryDiscovery('a 1', signal);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a%201/directory-discovery', {
    headers: { Authorization: 'Bearer private-token' }, credentials: 'omit', cache: 'no-store', signal,
  });
});
it('returns null without a request when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestDirectoryDiscovery('a1', new AbortController().signal)).resolves.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});
