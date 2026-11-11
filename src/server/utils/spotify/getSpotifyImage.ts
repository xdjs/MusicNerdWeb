import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { spotifyGet } from '@/server/utils/spotify/spotifyGet';
import { SpotifyCooldownError } from '@/server/utils/spotify/SpotifyCooldownError';
import { observedSpotifyCooldowns } from '@/server/utils/spotify/spotifyCooldownState';
import { spotifyCooldownKey } from '@/server/utils/spotify/spotifyCooldownKey';
import { getSpotifyHeaders } from '@/server/utils/queries/externalApiQueries';
import type { SpotifyHeaderType, ArtistSpotifyImage } from '@/server/utils/queries/externalApiQueries';

export async function getSpotifyImage(
    artistSpotifyId: string | null,
    artistId = "",
    spotifyHeaders?: SpotifyHeaderType,
): Promise<ArtistSpotifyImage> {
    if (!artistSpotifyId) return { artistImage: "", artistId };
    let headers = spotifyHeaders;
    let headerError: unknown;
    const deadline = observedSpotifyCooldowns.get(spotifyCooldownKey()) ?? 0;
    if (deadline > Date.now()) {
        // Avoid repeated stale-token revalidation for portrait reads. Other
        // consumers can still use their valid token and cached catalog data.
        headers = undefined;
        headerError = new SpotifyCooldownError(deadline);
    } else if (!headers) {
        try {
            // Resolve auth outside the image cache: Next bypasses nested
            // unstable_cache reads, which would mint a token for every miss.
            headers = await getSpotifyHeaders();
        } catch (error) {
            headerError = error;
        }
    }
    // Public images depend on artist identity, not transport tokens. A known
    // cooldown may reuse an older success without background revalidation;
    // ordinary daily revalidation resumes when the deadline expires.
    const cachedImage = cachedOrDirect(async (): Promise<string> => {
        if (!headers) throw headerError;
        const artistData = await spotifyGet(
            `https://api.spotify.com/v1/artists/${artistSpotifyId}`,
            { ...headers, timeout: 2000 },
        );
        return artistData.data.images?.[0]?.url ?? "";
    }, ["spotify-image-v3", artistSpotifyId], {
        tags: ["spotify-image"],
        revalidate: headerError instanceof SpotifyCooldownError ? Number.MAX_SAFE_INTEGER : 60 * 60 * 24,
    });
    try {
        return { artistImage: await cachedImage(), artistId };
    } catch (error) {
        if (!(error instanceof SpotifyCooldownError)) {
            console.error(`Error fetching image for artist ${artistSpotifyId}`);
        }
        return { artistImage: "", artistId };
    }
}
