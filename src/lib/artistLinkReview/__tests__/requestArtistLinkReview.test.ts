import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistLinkReview } from '../requestArtistLinkReview';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const decision = { id: 'source-1', kind: 'source' as const, decision: 'remove' as const };
beforeEach(() => { jest.clearAllMocks(); token.mockResolvedValue('private-token'); global.fetch = jest.fn().mockResolvedValue({ ok: true }); });

it('posts only the decision to the API with bearer authorization and no cookies', async () => {
  expect((await requestArtistLinkReview('artist 1', decision)).ok).toBe(true);
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist%201/link-suggestions', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify(decision), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});
it('does not post when Privy has no token', async () => {
  token.mockResolvedValue(null);
  await expect(requestArtistLinkReview('a1', decision)).rejects.toThrow('sign in');
  expect(fetch).not.toHaveBeenCalled();
});
