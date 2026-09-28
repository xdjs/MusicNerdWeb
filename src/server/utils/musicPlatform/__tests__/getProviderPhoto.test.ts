jest.mock('../deezerProvider', () => ({ deezerProvider: { getArtist: jest.fn() } }));
jest.mock('../spotifyProvider', () => ({ spotifyProvider: { getArtistImage: jest.fn() } }));
import { getProviderPhoto } from '../getProviderPhoto';
import { deezerProvider } from '../deezerProvider';
import { spotifyProvider } from '../spotifyProvider';
import type { Artist } from '@/server/db/DbTypes';
const artist = { deezer: ' dz ', spotify: 'sp', customImage: 'https://example.com/saved.jpg' } as Artist;
beforeEach(() => jest.clearAllMocks());
it('requests only the selected linked provider, ignoring saved photo for previews', async () => {
    jest.mocked(deezerProvider.getArtist).mockResolvedValue({ imageUrl: 'https://cdn.example.com/dz.jpg' } as never);
    expect(await getProviderPhoto(artist, 'deezer')).toBe('https://cdn.example.com/dz.jpg');
    expect(deezerProvider.getArtist).toHaveBeenCalledWith('dz');
    expect(spotifyProvider.getArtistImage).not.toHaveBeenCalled();
});
it('does not look up a missing provider link', async () => {
    expect(await getProviderPhoto({ ...artist, spotify: null }, 'spotify')).toBeNull();
    expect(spotifyProvider.getArtistImage).not.toHaveBeenCalled();
});
it('rejects failed, unsafe and empty remote images', async () => {
    for (const image of [null, '', 'javascript:alert(1)', 'http://example.com/a', 'https://user:pass@example.com/a']) {
        jest.mocked(spotifyProvider.getArtistImage).mockResolvedValueOnce(image);
        expect(await getProviderPhoto(artist, 'spotify')).toBeNull();
    }
    jest.mocked(spotifyProvider.getArtistImage).mockRejectedValueOnce(new Error('Down'));
    expect(await getProviderPhoto(artist, 'spotify')).toBeNull();
});
