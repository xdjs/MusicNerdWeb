import { getAccessToken } from '@privy-io/react-auth';
import { requestAddArtist } from '../requestAddArtist';

jest.mock('@privy-io/react-auth', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
const token = getAccessToken as jest.Mock;
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
beforeEach(() => {
    jest.clearAllMocks();
    token.mockResolvedValue('private-token');
    global.fetch = jest.fn();
});

it('posts the id to the API with bearer authorization and maps created to success', async () => {
    (fetch as jest.Mock).mockResolvedValue(reply(200, { status: 'ok', result: 'created', artistId: 'a1', artistName: 'Radiohead', message: 'Success!' }));
    expect(await requestAddArtist('s1')).toEqual({ status: 'success', artistId: 'a1', artistName: 'Radiohead', message: 'Success!' });
    expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist', {
        method: 'POST', headers: { Authorization: 'Bearer private-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId: 's1', platform: 'spotify' }), credentials: 'omit', redirect: 'error', cache: 'no-store',
    });
});

it('sends forceCreate and keeps the other outcomes and their candidates', async () => {
    const candidates = [{ id: 'b', name: 'Radiohead', spotify: null, deezer: '399' }];
    (fetch as jest.Mock).mockResolvedValue(reply(200, { status: 'ok', result: 'possible_duplicate', candidates, platform: 'deezer', platformId: '399', message: 'm' }));
    expect(await requestAddArtist('399', 'deezer', { forceCreate: true })).toEqual({ status: 'possible_duplicate', candidates, platform: 'deezer', platformId: '399', message: 'm' });
    expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ platformId: '399', platform: 'deezer', forceCreate: true });
});

it('reports signed out without a token or on a 401, and an API error with its message', async () => {
    token.mockResolvedValueOnce(null);
    expect(await requestAddArtist('s1')).toMatchObject({ status: 'error', code: 'UNAUTHENTICATED' });
    expect(fetch).not.toHaveBeenCalled();
    (fetch as jest.Mock).mockResolvedValueOnce(reply(401, { status: 'error', error: 'Not signed in' }));
    expect(await requestAddArtist('s1')).toMatchObject({ status: 'error', code: 'UNAUTHENTICATED' });
    (fetch as jest.Mock).mockResolvedValueOnce(reply(404, { status: 'error', error: 'Could not find artist on spotify' }));
    expect(await requestAddArtist('s1')).toEqual({ status: 'error', message: 'Could not find artist on spotify' });
});
