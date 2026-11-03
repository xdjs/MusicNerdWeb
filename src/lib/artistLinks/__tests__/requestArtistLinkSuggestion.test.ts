import { getAccessToken } from '@privy-io/react-auth';
import { requestArtistLinkSuggestion } from '../requestArtistLinkSuggestion';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const url = 'https://www.instagram.com/p3t3rango/';
beforeEach(() => {
  jest.clearAllMocks();
  token.mockResolvedValue('private-token');
  global.fetch = jest.fn();
});

it('posts the url to the API with bearer authorization and returns the display name', async () => {
  (fetch as jest.Mock).mockResolvedValue(reply(200, { status: 'ok', approved: false, siteName: 'instagram', platformName: 'Instagram', message: 'Thanks' }));
  expect(await requestArtistLinkSuggestion('a1', url)).toEqual({ status: 'success', message: 'Thanks', siteName: 'Instagram' });
  expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/a1/links', {
    method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }), credentials: 'omit', redirect: 'error', cache: 'no-store',
  });
});

it('returns an API refusal with its message, and asks to sign in without a token', async () => {
  (fetch as jest.Mock).mockResolvedValue(reply(409, { status: 'error', error: 'This artist data has already been added' }));
  expect(await requestArtistLinkSuggestion('a1', url)).toEqual({ status: 'error', message: 'This artist data has already been added' });
  token.mockResolvedValue(null);
  expect(await requestArtistLinkSuggestion('a1', url)).toMatchObject({ status: 'error' });
  expect(fetch).toHaveBeenCalledTimes(1);
});
