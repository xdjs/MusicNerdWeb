import { jest } from '@jest/globals';

jest.mock('next/cache', () => ({ unstable_cache: jest.fn((fn) => fn) }));
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({ getSpotifyHeaders: jest.fn() }));

const spotifyArtistId = '0TnOYISbd1XYRBk9myaseg';
const spotifyAlbumId = '2up3OPMp9Tb4dAKM2erWXQ';
const artist = { deezer: '27', spotify: spotifyArtistId };

function deezerAlbum(id: number, releaseDate: string, extra: Record<string, unknown> = {}) {
    return {
        id, title: `Release ${id}`, release_date: releaseDate, record_type: 'album',
        link: `https://www.deezer.com/album/${id}`,
        cover_big: `https://cdn-images.dzcdn.net/images/cover/${id}/500x500.jpg`,
        ...extra,
    };
}

function spotifyAlbum(extra: Record<string, unknown> = {}) {
    return {
        id: spotifyAlbumId, name: 'Single', release_date: '2026-08-24', album_type: 'single',
        album_group: 'single', external_urls: { spotify: `https://open.spotify.com/album/${spotifyAlbumId}` },
        images: [{ url: 'https://i.scdn.co/image/actual-cover' }],
        ...extra,
    };
}

async function setup() {
    const axios = (await import('axios')).default;
    const { getSpotifyHeaders } = await import('@/server/utils/queries/externalApiQueries');
    const { getLatestArtistReleases } = await import('../latestReleases');
    const axiosGet = jest.mocked(axios.get);
    const headers = jest.mocked(getSpotifyHeaders);
    headers.mockResolvedValue({ headers: { Authorization: 'Bearer test-token' } });
    return { getLatestArtistReleases, axiosGet, headers };
}

describe('getLatestArtistReleases', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-09-06T12:00:00Z'));
    });
    afterEach(() => jest.useRealTimers());

    it('gets known Deezer catalog artwork and selects the newest three released titles', async () => {
        const { getLatestArtistReleases, axiosGet, headers } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [
            deezerAlbum(1, '2025-01-01'), deezerAlbum(2, '2026-08-12'),
            deezerAlbum(3, '2026-09-07'), deezerAlbum(4, '2026-09-06', { record_type: 'single' }),
            deezerAlbum(5, '2026-04-01', { record_type: 'ep' }),
        ] } });

        const result = await getLatestArtistReleases({ ...artist, spotify: null });

        expect(result.map(({ id }) => id)).toEqual(['4', '2', '5']);
        expect(result[0]).toMatchObject({
            id: '4', title: 'Release 4', releaseDate: '2026-09-06', kind: 'single', platform: 'deezer',
            url: 'https://www.deezer.com/album/4',
            imageUrl: 'https://cdn-images.dzcdn.net/images/cover/4/500x500.jpg',
        });
        expect(axiosGet).toHaveBeenCalledWith('https://api.deezer.com/artist/27/albums?limit=50',
            expect.objectContaining({ timeout: 5000, signal: expect.any(AbortSignal) }));
        expect(headers).not.toHaveBeenCalled();
    });

    it('falls back to Spotify with existing token helper when Deezer fails', async () => {
        const { getLatestArtistReleases, axiosGet, headers } = await setup();
        axiosGet.mockRejectedValueOnce(new Error('Deezer unavailable'))
            .mockResolvedValueOnce({ data: { items: [spotifyAlbum()] } });

        expect(await getLatestArtistReleases(artist)).toMatchObject([{
            id: spotifyAlbumId, title: 'Single', releaseDate: '2026-08-24', kind: 'single', platform: 'spotify',
            url: `https://open.spotify.com/album/${spotifyAlbumId}`, imageUrl: 'https://i.scdn.co/image/actual-cover',
        }]);
        expect(headers).toHaveBeenCalledTimes(1);
        expect(axiosGet).toHaveBeenLastCalledWith(expect.stringContaining('include_groups=album%2Csingle&limit=50'),
            expect.objectContaining({ headers: { Authorization: 'Bearer test-token' }, timeout: 5000 }));
    });

    it('uses the fallback for a clean empty Deezer catalog too', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [] } })
            .mockResolvedValueOnce({ data: { items: [spotifyAlbum()] } });
        expect((await getLatestArtistReleases(artist))[0]?.platform).toBe('spotify');
    });

    it('returns no releases without usable known IDs and never searches by name', async () => {
        const { getLatestArtistReleases, axiosGet, headers } = await setup();
        expect(await getLatestArtistReleases({ deezer: null, spotify: null })).toEqual([]);
        expect(await getLatestArtistReleases({ deezer: '../search?q=artist', spotify: 'artist-name' })).toEqual([]);
        expect(axiosGet).not.toHaveBeenCalled();
        expect(headers).not.toHaveBeenCalled();
    });

    it('preserves partial date precision and excludes unfinished periods and invalid dates', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [
            deezerAlbum(1, '2025'), deezerAlbum(2, '2026-08'), deezerAlbum(3, '2026'),
            deezerAlbum(4, '2026-09'), deezerAlbum(5, '2026-02-30'), deezerAlbum(6, '2026-13-01'),
            deezerAlbum(7, '0000'), deezerAlbum(8, '2026-08-01T00:00:00Z'),
        ] } });
        expect((await getLatestArtistReleases({ ...artist, spotify: null })).map(({ releaseDate }) => releaseDate))
            .toEqual(['2026-08', '2025']);
    });

    it('omits invalid release links, title/date fields and compilations', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [
            deezerAlbum(1, '2026-08-01', { link: 'https://www.deezer.com.evil.test/album/1' }),
            deezerAlbum(2, '2026-08-01', { link: 'https://www.deezer.com/album/999' }),
            deezerAlbum(3, '2026-08-01', { link: 'javascript:alert(1)' }),
            deezerAlbum(4, '2026-08-01', { title: '   ' }),
            deezerAlbum(5, '2026-08-01', { release_date: null }),
            deezerAlbum(6, '2026-08-01', { record_type: 'compilation' }),
            null,
        ] } });
        expect(await getLatestArtistReleases({ ...artist, spotify: null })).toEqual([]);
    });

    it('omits Spotify appears-on releases and mismatched external URLs', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { items: [
            spotifyAlbum({ album_group: 'appears_on' }),
            spotifyAlbum({ external_urls: { spotify: `https://evil.test/album/${spotifyAlbumId}` } }),
        ] } });
        expect(await getLatestArtistReleases({ ...artist, deezer: null })).toEqual([]);
    });

    it('leaves missing/unsafe artwork null and retains an actual lower-resolution cover', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [
            deezerAlbum(1, '2026-08-01', { cover_big: undefined }),
            deezerAlbum(2, '2026-08-02', { cover_big: 'https://evil.test/cover.jpg' }),
            deezerAlbum(3, '2026-08-03', { cover_big: 'javascript:alert(1)', cover_medium: 'https://cdn-images.dzcdn.net/real.jpg' }),
        ] } });
        const result = await getLatestArtistReleases({ ...artist, spotify: null });
        expect(result.map(({ imageUrl }) => imageUrl)).toEqual(['https://cdn-images.dzcdn.net/real.jpg', null, null]);
    });

    it('deduplicates repeated catalog editions with the same title and release date', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { data: [
            deezerAlbum(1, '2026-08-01', { title: 'Same' }),
            deezerAlbum(2, '2026-08-01', { title: ' same ' }), deezerAlbum(3, '2026-07-01'),
        ] } });
        expect((await getLatestArtistReleases({ ...artist, spotify: null })).map(({ id }) => id)).toEqual(['1', '3']);
    });

    it('distinguishes total provider failure from a successful empty catalog', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { error: { message: 'Provider down' } } })
            .mockRejectedValueOnce(new Error('Spotify down'));
        await expect(getLatestArtistReleases(artist)).rejects.toThrow('Artist release providers unavailable');

        axiosGet.mockResolvedValueOnce({ data: { data: [] } }).mockRejectedValueOnce(new Error('Spotify down'));
        expect(await getLatestArtistReleases(artist)).toEqual([]);
    });

    it('throws when the only known provider returns a malformed catalog', async () => {
        const { getLatestArtistReleases, axiosGet } = await setup();
        axiosGet.mockResolvedValueOnce({ data: { unexpected: [] } });
        await expect(getLatestArtistReleases({ ...artist, spotify: null })).rejects.toThrow('Artist release providers unavailable');
    });

    it('bounds waiting for Spotify token acquisition', async () => {
        const { getLatestArtistReleases, headers, axiosGet } = await setup();
        headers.mockImplementationOnce(() => new Promise(() => {}));
        const pending = expect(getLatestArtistReleases({ ...artist, deezer: null }))
            .rejects.toThrow('Artist release providers unavailable');
        await jest.advanceTimersByTimeAsync(5000);
        await pending;
        expect(axiosGet).not.toHaveBeenCalled();
    });
});

it('combines matching releases from both known artist catalogs and keeps distinct editions separate', async () => {
    const { getLatestArtistReleases, axiosGet } = await setup();
    axiosGet.mockResolvedValueOnce({ data: { data: [deezerAlbum(1, '2024-07-16', { title: 'Unfinished Hugs', record_type: 'single' })] } })
        .mockResolvedValueOnce({ data: { items: [spotifyAlbum({ name: 'Unfinished Hugs', release_date: '2024-07-16' }),
            spotifyAlbum({ id: '3up3OPMp9Tb4dAKM2erWXQ', name: 'Unfinished Hugs (Deluxe)', release_date: '2024-07-16', external_urls: { spotify: 'https://open.spotify.com/album/3up3OPMp9Tb4dAKM2erWXQ' } })] } });
    const result = await getLatestArtistReleases(artist);
    expect(axiosGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result.find(release => release.title === 'Unfinished Hugs')?.listeningLinks?.map(link => link.siteName)).toEqual(['deezer', 'spotify']);
    expect(result.find(release => release.title.includes('Deluxe'))?.listeningLinks).toHaveLength(1);
});
