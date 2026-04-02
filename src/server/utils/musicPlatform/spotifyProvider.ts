import type { MusicPlatformArtist, MusicPlatformProvider } from './types';
import {
    getSpotifyHeaders,
    getSpotifyArtist,
    getSpotifyImage,
    getNumberOfSpotifyReleases,
    getArtistTopTrackName,
    getSpotifyArtists,
    type SpotifyArtist,
} from '@/server/utils/queries/externalApiQueries';
import axios from 'axios';

interface SpotifySearchResponse {
    artists: {
        items: SpotifyArtist[];
    };
}

function mapSpotifyArtist(
    artist: SpotifyArtist,
    albumCount: number,
    topTrackName: string | null,
): MusicPlatformArtist {
    return {
        platform: 'spotify',
        platformId: artist.id,
        name: artist.name,
        imageUrl: artist.images[0]?.url ?? null,
        followerCount: artist.followers.total,
        albumCount,
        genres: artist.genres,
        profileUrl: artist.external_urls.spotify,
        topTrackName,
    };
}

export class SpotifyProvider implements MusicPlatformProvider {
    readonly platform = 'spotify' as const;

    async getArtist(id: string): Promise<MusicPlatformArtist | null> {
        const headers = await getSpotifyHeaders();
        const [artistResponse, albumCount, topTrackName] = await Promise.all([
            getSpotifyArtist(id, headers),
            getNumberOfSpotifyReleases(id, headers),
            getArtistTopTrackName(id, headers),
        ]);

        if (artistResponse.error || !artistResponse.data) return null;

        return mapSpotifyArtist(artistResponse.data, albumCount, topTrackName);
    }

    async getArtistImage(id: string): Promise<string | null> {
        const headers = await getSpotifyHeaders();
        const result = await getSpotifyImage(id, '', headers);
        return result.artistImage || null;
    }

    async getTopTrackName(id: string): Promise<string | null> {
        const headers = await getSpotifyHeaders();
        return getArtistTopTrackName(id, headers);
    }

    async searchArtists(query: string, limit: number): Promise<MusicPlatformArtist[]> {
        try {
            const headers = await getSpotifyHeaders();
            const response = await axios.get<SpotifySearchResponse>(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
                headers,
            );
            return response.data.artists.items.map((artist) =>
                mapSpotifyArtist(artist, 0, null),
            );
        } catch (error) {
            console.error('SpotifyProvider.searchArtists failed:', error);
            return [];
        }
    }

    async getArtists(ids: string[]): Promise<MusicPlatformArtist[]> {
        if (ids.length === 0) return [];

        const headers = await getSpotifyHeaders();
        const artists = await getSpotifyArtists(ids, headers);
        return artists
            .filter(Boolean)
            .map((artist: SpotifyArtist) => mapSpotifyArtist(artist, 0, null));
    }
}

export const spotifyProvider = new SpotifyProvider();
