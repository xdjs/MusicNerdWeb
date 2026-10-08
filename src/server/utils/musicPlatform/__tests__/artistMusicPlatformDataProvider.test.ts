// @ts-nocheck
import { jest } from '@jest/globals';

jest.mock('p-limit', () => ({
    __esModule: true,
    default: jest.fn(() => {
        return (fn: () => Promise<unknown>) => fn();
    }),
}));

import type { Artist } from '@/server/db/DbTypes';
import type { MusicPlatformArtist, MusicPlatformProvider } from '../types';

// Dynamic import so p-limit mock takes effect before module loads
let ArtistMusicPlatformDataProvider: typeof import('../artistMusicPlatformDataProvider').ArtistMusicPlatformDataProvider;

function makeArtist(overrides: Partial<Artist> = {}): Artist {
    return {
        id: 'uuid-123',
        name: 'Test Artist',
        spotify: null,
        deezer: null,
        subvert: null,
        bluesky: null,
        lcname: 'test artist',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        ...overrides,
    } as Artist;
}

const mockDeezerResult: MusicPlatformArtist = {
    platform: 'deezer',
    platformId: '4738512',
    name: 'FKJ',
    imageUrl: 'https://deezer.com/image.jpg',
    followerCount: 1200000,
    albumCount: 8,
    genres: [],
    profileUrl: 'https://www.deezer.com/artist/4738512',
    topTrackName: 'Ylang Ylang',
};

const mockSpotifyResult: MusicPlatformArtist = {
    platform: 'spotify',
    platformId: 'spotify-123',
    name: 'FKJ',
    imageUrl: 'https://spotify.com/image.jpg',
    followerCount: 500000,
    albumCount: 5,
    genres: ['electronic'],
    profileUrl: 'https://open.spotify.com/artist/spotify-123',
    topTrackName: 'Tadow',
};

function createMockProvider(platform: 'deezer' | 'spotify', defaultResult: MusicPlatformArtist | null): MusicPlatformProvider & {
    getArtist: jest.Mock;
    getArtistIdentity: jest.Mock;
    getArtistImage: jest.Mock;
    getTopTrackName: jest.Mock;
    searchArtists: jest.Mock;
    getArtists: jest.Mock;
} {
    return {
        platform,
        getArtist: jest.fn<() => Promise<MusicPlatformArtist | null>>().mockResolvedValue(defaultResult),
        getArtistIdentity: jest.fn().mockResolvedValue(defaultResult && {
            platform: defaultResult.platform,
            platformId: defaultResult.platformId,
            name: defaultResult.name,
        }),
        getArtistImage: jest.fn<() => Promise<string | null>>().mockResolvedValue(defaultResult?.imageUrl ?? null),
        getTopTrackName: jest.fn<() => Promise<string | null>>().mockResolvedValue(defaultResult?.topTrackName ?? null),
        searchArtists: jest.fn<() => Promise<MusicPlatformArtist[]>>().mockResolvedValue(defaultResult ? [defaultResult] : []),
        getArtists: jest.fn<() => Promise<MusicPlatformArtist[]>>().mockResolvedValue(defaultResult ? [defaultResult] : []),
    };
}

describe('ArtistMusicPlatformDataProvider', () => {
    let primary: ReturnType<typeof createMockProvider>;
    let fallback: ReturnType<typeof createMockProvider>;
    let ampdp: InstanceType<typeof ArtistMusicPlatformDataProvider>;

    beforeEach(async () => {
        jest.resetModules();
        const mod = await import('../artistMusicPlatformDataProvider');
        ArtistMusicPlatformDataProvider = mod.ArtistMusicPlatformDataProvider;
        primary = createMockProvider('deezer', mockDeezerResult);
        fallback = createMockProvider('spotify', mockSpotifyResult);
        ampdp = new ArtistMusicPlatformDataProvider(primary, fallback);
    });

    describe('getArtist', () => {
        it('should use primary (Deezer) when artist has both IDs', async () => {
            const artist = makeArtist({ deezer: '4738512', spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockDeezerResult);
            expect(primary.getArtist).toHaveBeenCalledWith('4738512');
            expect(fallback.getArtist).not.toHaveBeenCalled();
        });

        it('should use primary when artist has deezer only', async () => {
            const artist = makeArtist({ deezer: '4738512' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockDeezerResult);
            expect(primary.getArtist).toHaveBeenCalledWith('4738512');
        });

        it('should use fallback when artist has spotify only', async () => {
            const artist = makeArtist({ spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockSpotifyResult);
            expect(primary.getArtist).not.toHaveBeenCalled();
            expect(fallback.getArtist).toHaveBeenCalledWith('spotify-123');
        });

        it('should return null when artist has neither ID', async () => {
            const artist = makeArtist();

            const result = await ampdp.getArtist(artist);

            expect(result).toBeNull();
            expect(primary.getArtist).not.toHaveBeenCalled();
            expect(fallback.getArtist).not.toHaveBeenCalled();
        });

        it('should fall back to Spotify when Deezer returns null', async () => {
            primary.getArtist.mockResolvedValueOnce(null);
            const artist = makeArtist({ deezer: '4738512', spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockSpotifyResult);
            expect(primary.getArtist).toHaveBeenCalledWith('4738512');
            expect(fallback.getArtist).toHaveBeenCalledWith('spotify-123');
        });

        it('should fall back to Spotify when Deezer throws', async () => {
            primary.getArtist.mockRejectedValueOnce(new Error('Deezer down'));
            const artist = makeArtist({ deezer: '4738512', spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockSpotifyResult);
            expect(primary.getArtist).toHaveBeenCalledWith('4738512');
            expect(fallback.getArtist).toHaveBeenCalledWith('spotify-123');
        });

        it('should treat empty string deezer ID as null', async () => {
            const artist = makeArtist({ deezer: '', spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockSpotifyResult);
            expect(primary.getArtist).not.toHaveBeenCalled();
        });

        it('should treat whitespace-only deezer ID as null', async () => {
            const artist = makeArtist({ deezer: '  ', spotify: 'spotify-123' });

            const result = await ampdp.getArtist(artist);

            expect(result).toEqual(mockSpotifyResult);
            expect(primary.getArtist).not.toHaveBeenCalled();
        });
    });

    describe('saved photos and automatic defaults', () => {
        it('keeps Pete Rango and other saved portraits without provider calls', async () => {
            const artist = makeArtist({ customImage: 'https://storage.example/pete.png', deezer: '1', spotify: 'sp' });
            expect(await ampdp.getArtistImage(artist)).toBe(artist.customImage);
            expect(await ampdp.getArtistPortrait(artist)).toBe(artist.customImage);
            expect(primary.getArtistImage).not.toHaveBeenCalled();
            expect(fallback.getArtistImage).not.toHaveBeenCalled();
        });
        it('preserves Bike Lane after her existing Spotify photo is pinned', async () => {
            const artist = makeArtist({ name: 'Bike Lane', spotify: '4hmP7SKOIhC8e1PZo8UG7f', deezer: '1', customImage: 'https://i.scdn.co/image/ab6761610000e5eb082c9de8bc6a6e4fbc5c808b' });
            expect(await ampdp.getArtistPortrait(artist)).toBe(artist.customImage);
            expect(await ampdp.getArtistImage(artist)).toBe(artist.customImage);
        });
        it('prefers Spotify for thumbnails and portraits when both providers have images', async () => {
            const artist = makeArtist({ deezer: '4738512', spotify: 'spotify-123', customImage: '  ' });
            expect(await ampdp.getArtistImage(artist)).toBe(mockSpotifyResult.imageUrl);
            expect(await ampdp.getArtistPortrait(artist)).toBe(mockSpotifyResult.imageUrl);
            expect(fallback.getArtistImage).toHaveBeenCalledWith('spotify-123');
            expect(primary.getArtist).not.toHaveBeenCalled();
            expect(primary.getArtistImage).not.toHaveBeenCalled();
        });
        it.each([null, '', '  '])('falls back to Deezer when Spotify image is %p', async image => {
            fallback.getArtistImage.mockResolvedValue(image);
            const artist = makeArtist({ deezer: '1', spotify: 'sp' });
            expect(await ampdp.getArtistImage(artist)).toBe(mockDeezerResult.imageUrl);
            expect(await ampdp.getArtistPortrait(artist)).toBe(mockDeezerResult.imageUrl);
            expect(primary.getArtist).toHaveBeenCalledWith('1');
        });
        it('uses Deezer if Spotify throws', async () => {
            fallback.getArtistImage.mockRejectedValue(new Error('Unavailable'));
            expect(await ampdp.getArtistPortrait(makeArtist({ deezer: '1', spotify: 'sp' }))).toBe(mockDeezerResult.imageUrl);
        });
        it('returns null when both image providers fail', async () => {
            fallback.getArtistImage.mockRejectedValue(new Error('Unavailable'));
            primary.getArtist.mockRejectedValue(new Error('Unavailable'));
            expect(await ampdp.getArtistPortrait(makeArtist({ deezer: '1', spotify: 'sp' }))).toBeNull();
        });
        it('keeps Spotify-only artists working', async () => {
            expect(await ampdp.getArtistPortrait(makeArtist({ spotify: 'sp' }))).toBe(mockSpotifyResult.imageUrl);
        });
    });

    describe('searchArtists', () => {
        it('should always delegate to primary provider', async () => {
            const result = await ampdp.searchArtists('FKJ', 10);

            expect(result).toEqual([mockDeezerResult]);
            expect(primary.searchArtists).toHaveBeenCalledWith('FKJ', 10);
            expect(fallback.searchArtists).not.toHaveBeenCalled();
        });
    });

    describe('getArtistImages', () => {
        it('should return Map keyed by artist UUID', async () => {
            const artists = [
                makeArtist({ id: 'uuid-1', deezer: '111' }),
                makeArtist({ id: 'uuid-2', spotify: 'sp-222' }),
            ];
            primary.getArtistImage.mockResolvedValue('https://deezer.com/img1.jpg');
            fallback.getArtistImage.mockResolvedValue('https://spotify.com/img2.jpg');

            const result = await ampdp.getArtistImages(artists);

            expect(result.size).toBe(2);
            expect(result.get('uuid-1')).toBe('https://deezer.com/img1.jpg');
            expect(result.get('uuid-2')).toBe('https://spotify.com/img2.jpg');
        });

        it('should skip artists with no platform IDs', async () => {
            const artists = [
                makeArtist({ id: 'uuid-1', deezer: '111' }),
                makeArtist({ id: 'uuid-no-ids' }),
            ];

            const result = await ampdp.getArtistImages(artists);

            expect(result.size).toBe(1);
            expect(result.has('uuid-no-ids')).toBe(false);
        });
    });

    describe('getActivePlatform', () => {
        it('should return deezer when artist has deezer ID', () => {
            const artist = makeArtist({ deezer: '4738512' });
            expect(ampdp.getActivePlatform(artist)).toBe('deezer');
        });

        it('should return spotify when artist has only spotify ID', () => {
            const artist = makeArtist({ spotify: 'spotify-123' });
            expect(ampdp.getActivePlatform(artist)).toBe('spotify');
        });

        it('should return deezer when artist has both IDs', () => {
            const artist = makeArtist({ deezer: '4738512', spotify: 'spotify-123' });
            expect(ampdp.getActivePlatform(artist)).toBe('deezer');
        });

        it('should return null when artist has neither ID', () => {
            const artist = makeArtist();
            expect(ampdp.getActivePlatform(artist)).toBeNull();
        });
    });
});
