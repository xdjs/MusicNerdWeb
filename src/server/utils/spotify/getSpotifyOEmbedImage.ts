const RETRY_DELAY_MS = 30_000;
const MAX_FAILED_ARTISTS = 1000;
const failedUntil = new Map<string, number>();
const pendingImages = new Map<string, Promise<string | null>>();

/** Keep the public fallback independent of the authenticated API cooldown. */
export async function getSpotifyOEmbedImage(id: string): Promise<string | null> {
    if ((failedUntil.get(id) ?? 0) > Date.now()) return null;
    failedUntil.delete(id);
    const existing = pendingImages.get(id);
    if (existing) return existing;

    const pending = (async (): Promise<string | null> => {
        try {
            const artistUrl = `https://open.spotify.com/artist/${encodeURIComponent(id)}`;
            const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(artistUrl)}`, {
                signal: AbortSignal.timeout(2500),
                next: { revalidate: 60 * 60 * 24 },
            });
            if (!response.ok) return null;
            const data: unknown = await response.json();
            const thumbnail = (data as { thumbnail_url?: unknown })?.thumbnail_url;
            if (typeof thumbnail !== 'string') return null;
            const url = new URL(thumbnail);
            if (url.protocol !== 'https:' || (url.hostname !== 'i.scdn.co' && !url.hostname.endsWith('.spotifycdn.com'))) return null;
            return url.href;
        } catch (error) {
            console.error('SpotifyProvider.getArtistImage oEmbed failed:', error);
            return null;
        }
    })().then(image => {
        if (!image) {
            failedUntil.set(id, Date.now() + RETRY_DELAY_MS);
            if (failedUntil.size > MAX_FAILED_ARTISTS) {
                const oldest = failedUntil.keys().next().value;
                if (oldest !== undefined) failedUntil.delete(oldest);
            }
        }
        return image;
    }).finally(() => pendingImages.delete(id));
    pendingImages.set(id, pending);
    return pending;
}
