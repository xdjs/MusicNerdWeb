/** @jest-environment node */
import type { Artist } from '@/server/db/DbTypes';
jest.mock('axios');
// The portrait entry point does not use the batch-image limiter.
jest.mock('p-limit', () => ({ __esModule: true, default: () => (fn: () => Promise<unknown>) => fn() }));
jest.mock('@/env', () => ({ SPOTIFY_WEB_CLIENT_ID: 'fixture', SPOTIFY_WEB_CLIENT_SECRET: 'fixture' }));
jest.mock('next/cache', () => {
    Object.defineProperty(globalThis, 'AsyncLocalStorage', {
        value: jest.requireActual('node:async_hooks').AsyncLocalStorage, configurable: true,
    });
    const entries = new Map<string, { value: unknown; savedAt: number }>();
    Object.defineProperty(globalThis, '__incrementalCache', { configurable: true, value: {
        generateSimpleCacheKey: async (key: string) => key,
        get: async (key: string, context: { revalidate?: number }) => {
            const entry = entries.get(key);
            return entry ? { value: entry.value, isStale: (Date.now() - entry.savedAt) / 1000 > (context.revalidate ?? 0) } : null;
        },
        set: async (key: string, value: unknown) => { entries.set(key, { value, savedAt: Date.now() }); },
    } });
    return jest.requireActual('next/dist/server/web/spec-extension/unstable-cache');
});
beforeEach(() => {
    jest.resetModules();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(fetch).mockReset();
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
    const { db } = await import('@/server/db/drizzle');
    const axios = (await import('axios')).default;
    const { SpotifyProvider } = await import('@/server/utils/musicPlatform/spotifyProvider');
    const { ArtistMusicPlatformDataProvider } = await import('@/server/utils/musicPlatform/artistMusicPlatformDataProvider');
    const primary = {
        platform: 'deezer' as const,
        getArtist: jest.fn().mockResolvedValue({ imageUrl: 'https://cdn-images.dzcdn.net/portrait' }),
        getArtistImage: jest.fn(), getArtistIdentity: jest.fn(), getTopTrackName: jest.fn(),
        getArtists: jest.fn(), searchArtists: jest.fn(),
    };
    const provider = new ArtistMusicPlatformDataProvider(primary, new SpotifyProvider());
    const artist = { id: 'fixture', spotify: 'spotify-fixture', deezer: '123', customImage: null } as Artist;
    const { workAsyncStorage } = jest.requireActual('next/dist/server/app-render/work-async-storage.external');
    const portrait = async (subject: Artist) => {
        // Exercise real App Router stale-while-revalidate and nested cache behavior.
        const workStore = { page: '/artist/[id]', route: '/artist/[id]', isStaticGeneration: false, pendingRevalidates: {} };
        const result = await workAsyncStorage.run(workStore, () => provider.getArtistPortrait(subject));
        await Promise.all(Object.values(workStore.pendingRevalidates));
        return result;
    };
    return { db, axios, primary, portrait, artist };
}

it('repeated portrait reads during cooldown reuse the guard, back off oEmbed and keep the Deezer fallback', async () => {
    const { db, axios, primary, portrait, artist } = await setup();
    const deadline = Date.now() + 60_000;
    jest.mocked(db.execute).mockResolvedValue([{ blocked_until: new Date(deadline).toISOString() }] as never);
    jest.mocked(fetch).mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    for (let i = 0; i < 100; i++) {
        expect(await portrait(artist)).toBe('https://cdn-images.dzcdn.net/portrait');
    }
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1); // The first oEmbed timeout, not expected cooldowns.
    expect(primary.getArtist).toHaveBeenCalledTimes(100);
});
it('keeps a warm Spotify portrait usable without an outbound token refresh during cooldown', async () => {
    const { db, axios, primary, portrait, artist } = await setup();
    jest.mocked(db.execute).mockResolvedValue([] as never);
    jest.mocked(axios.get).mockResolvedValue({ data: { images: [{ url: 'https://i.scdn.co/saved' }] } });
    const { getSpotifyImage } = await import('../getSpotifyImage');
    await getSpotifyImage(artist.spotify, '', {
        headers: { Authorization: 'Bearer fixture', 'x-token-expiry': String(Date.now() + 3_600_000) },
    });
    jest.mocked(db.execute).mockClear().mockResolvedValue([{ blocked_until: new Date(Date.now() + 60_000).toISOString() }] as never);
    jest.mocked(axios.get).mockClear();
    expect(await portrait(artist)).toBe('https://i.scdn.co/saved');
    expect(await portrait(artist)).toBe('https://i.scdn.co/saved');
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(primary.getArtist).not.toHaveBeenCalled();
});
it('keeps custom portraits entirely outside provider requests', async () => {
    const { db, axios, primary, portrait, artist } = await setup();
    expect(await portrait({ ...artist, customImage: 'https://example.com/saved.jpg' })).toBe('https://example.com/saved.jpg');
    expect(db.execute).not.toHaveBeenCalled();
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(primary.getArtist).not.toHaveBeenCalled();
});

it('shares the token cache across distinct uncached portraits instead of minting nested tokens', async () => {
    const { db, axios, portrait, artist } = await setup();
    jest.mocked(db.execute).mockResolvedValue([] as never);
    jest.mocked(axios.post).mockResolvedValue({ data: { access_token: 'fixture', expires_in: 3600 } });
    jest.mocked(axios.get).mockResolvedValue({ data: { images: [{ url: 'https://i.scdn.co/photo' }] } });
    const { getSpotifyHeaders } = await import('@/server/utils/queries/externalApiQueries');
    await getSpotifyHeaders();
    jest.mocked(axios.post).mockClear();
    expect(await portrait(artist)).toBe('https://i.scdn.co/photo');
    expect(await portrait({ ...artist, spotify: 'another' })).toBe('https://i.scdn.co/photo');
    expect(axios.post).not.toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledTimes(2);
});
it('serves a stale successful portrait quietly during cooldown and refreshes it after expiry', async () => {
    const { db, axios, portrait, artist } = await setup();
    const start = 1_800_000_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(start);
    jest.mocked(db.execute).mockResolvedValue([] as never);
    jest.mocked(axios.get).mockResolvedValue({ data: { images: [{ url: 'https://i.scdn.co/old' }] } });
    const { getSpotifyImage } = await import('../getSpotifyImage');
    await getSpotifyImage(artist.spotify, '', { headers: { Authorization: 'Bearer fixture' } });
    const staleAt = start + 2 * 86400_000;
    const deadline = staleAt + 60_000;
    jest.mocked(Date.now).mockReturnValue(staleAt);
    jest.mocked(db.execute).mockClear().mockResolvedValue([{ blocked_until: new Date(deadline).toISOString() }] as never);
    jest.mocked(axios.get).mockClear();
    for (let i = 0; i < 5; i++) expect(await portrait(artist)).toBe('https://i.scdn.co/old');
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(axios.get).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    jest.mocked(Date.now).mockReturnValue(deadline);
    jest.mocked(db.execute).mockResolvedValue([] as never);
    jest.mocked(axios.post).mockResolvedValue({ data: { access_token: 'new-fixture', expires_in: 3600 } });
    jest.mocked(axios.get).mockResolvedValue({ data: { images: [{ url: 'https://i.scdn.co/new' }] } });
    expect(await portrait(artist)).toBe('https://i.scdn.co/old'); // Stale-while-revalidate.
    expect(await portrait(artist)).toBe('https://i.scdn.co/new');
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledTimes(1);
});
