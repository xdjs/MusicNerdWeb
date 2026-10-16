import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { spotifyGet } from '@/server/utils/spotify/spotifyGet';
import type { SpotifyHeaderType } from '@/server/utils/queries/externalApiQueries';

// Separate success-only caches preserve partial results without caching a failed half.
const cachedReleases = cachedOrDirect(async (id: string, headers: SpotifyHeaderType): Promise<string[]> => {
    const result = await spotifyGet(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album%2Csingle&limit=20&market=US`, headers);
    return Array.from(new Set(((result.data.items ?? []) as Array<{ name?: string }>).map(a => a.name).filter((n): n is string => !!n))).slice(0, 15);
}, ['spotify-catalog-releases-v2'], { tags: ['spotify-catalog-names'], revalidate: 86400 });

const cachedTopTracks = cachedOrDirect(async (id: string, headers: SpotifyHeaderType): Promise<string[]> => {
    const result = await spotifyGet(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, headers);
    return ((result.data.tracks ?? []) as Array<{ name?: string }>).map(t => t.name).filter((n): n is string => !!n).slice(0, 8);
}, ['spotify-catalog-top-tracks-v2'], { tags: ['spotify-catalog-names'], revalidate: 86400 });

export async function getSpotifyCatalogNames(id: string | null, headers: SpotifyHeaderType): Promise<{ releases: string[]; topTracks: string[] }> {
    if (!id) return { releases: [], topTracks: [] };
    const [releases, tracks] = await Promise.allSettled([cachedReleases(id, headers), cachedTopTracks(id, headers)]);
    return {
        releases: releases.status === 'fulfilled' ? releases.value : [],
        topTracks: tracks.status === 'fulfilled' ? tracks.value : [],
    };
}
