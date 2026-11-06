import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistBioUpdate } from '../requestArtistBioUpdate';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it.each([{ bio: 'New About' }, { regenerate: true as const }])('PUTs %j to the API About with bearer authorization', async body => {
  const response = await requestArtistBioUpdate('a1', body);
  expect(response.ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artistBio/a1', {
    method: 'PUT', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), credentials: 'omit', cache: 'no-store',
  });
});
it('does not fall back to a cookie route when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistBioUpdate('a1', { bio: 'x' })).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
