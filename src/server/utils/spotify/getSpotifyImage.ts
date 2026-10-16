import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { spotifyGet } from '@/server/utils/spotify/spotifyGet';
import type { SpotifyHeaderType, ArtistSpotifyImage } from '@/server/utils/queries/externalApiQueries';

const cachedSpotifyImage = cachedOrDirect(async (artistSpotifyId: string, spotifyHeaders: SpotifyHeaderType): Promise<string> => {
    const artistData = await spotifyGet(
        `https://api.spotify.com/v1/artists/${artistSpotifyId}`,
        { ...spotifyHeaders, timeout: 2000 }
    );
    return artistData.data.images?.[0]?.url ?? "";
}, ["spotify-image-v2"], { tags: ["spotify-image"], revalidate: 60 * 60 * 24 });

export async function getSpotifyImage(artistSpotifyId: string | null, artistId: string = "", spotifyHeaders: SpotifyHeaderType): Promise<ArtistSpotifyImage> {
    if (!artistSpotifyId) return { artistImage: "", artistId };
    try {
        return { artistImage: await cachedSpotifyImage(artistSpotifyId, spotifyHeaders), artistId };
    } catch {
        console.error(`Error fetching image for artist ${artistSpotifyId}`);
        return { artistImage: "", artistId };
    }
}

