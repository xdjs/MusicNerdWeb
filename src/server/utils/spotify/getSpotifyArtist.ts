import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { spotifyGet } from '@/server/utils/spotify/spotifyGet';
import { getSpotifyHeaders } from '@/server/utils/queries/externalApiQueries';
import type { SpotifyHeaderType, SpotifyArtist, SpotifyArtistApiResponse } from '@/server/utils/queries/externalApiQueries';

class SpotifyArtistDataError extends Error {}

// Only successful data enters the cache; caller-facing fallbacks remain outside it.
const cachedSpotifyArtist = cachedOrDirect(async (artistId: string, headers: SpotifyHeaderType): Promise<SpotifyArtistApiResponse> => {
    console.debug("Fetching Spotify artist with ID:", artistId);
    
    if (!headers?.headers?.Authorization) {
        console.error("Missing Spotify authorization header");
        throw new SpotifyArtistDataError("Spotify authentication failed");
    }

    // Check if token is expired or about to expire
    if (Date.now() + 5 * 60 * 1000 >= Number(headers.headers['x-token-expiry'] || 0)) {
        console.debug("Token expired or about to expire, fetching new token");
        headers = await getSpotifyHeaders();
    }

    const { data } = await spotifyGet<SpotifyArtist>(
        `https://api.spotify.com/v1/artists/${artistId}`,
        headers
    );
    
    // Validate the response has all required fields
    if (!data) {
        console.error("No data returned from Spotify API");
        throw new SpotifyArtistDataError("No data returned from Spotify");
    }

    if (!data.name || !data.id) {
        console.error("Invalid Spotify artist data - missing required fields:", data);
        throw new SpotifyArtistDataError("Invalid artist data format from Spotify");
    }
    
    // Ensure arrays are initialized even if empty
    const safeData = {
        ...data,
        images: Array.isArray(data.images) ? data.images : [],
        genres: Array.isArray(data.genres) ? data.genres : [],
        followers: data.followers || { total: 0 }
    };
    
    return { data: safeData, error: null };

}, ["spotify-artist-v2"], { tags: ["spotify-artist"], revalidate: 60 * 60 * 24 });

export async function getSpotifyArtist(artistId: string, headers: SpotifyHeaderType): Promise<SpotifyArtistApiResponse> {
    try {
        return await cachedSpotifyArtist(artistId, headers);
    } catch (e: any) {
        if (e instanceof SpotifyArtistDataError) return { error: e.message, data: null };
        console.error("Error fetching Spotify data for artist", {
            artistId,
            error: e?.response?.data || e,
            status: e?.response?.status
        });
        
        if (!e.response) {
            return { error: "Network error while fetching artist data", data: null };
        }
        
        if (e.response?.status === 404 || e.response?.data?.error?.message === "invalid id") {
            return { error: "Invalid Spotify ID", data: null };
        }
        if (e.response?.status === 401) {
            return { error: "Spotify authentication failed", data: null };
        }
        if (e.response?.status === 429) {
            return { error: "Rate limit exceeded, please try again later", data: null };
        }
        
        return { error: "Failed to fetch artist data from Spotify", data: null };
    }
}

