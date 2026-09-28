import type { Artist } from '@/server/db/DbTypes';
import { deezerProvider } from './deezerProvider';
import { spotifyProvider } from './spotifyProvider';

/** Resolve only the requested, already-linked provider. No arbitrary URL fetching. */
export async function getProviderPhoto(artist: Artist, source: 'deezer' | 'spotify'): Promise<string | null> {
    const id = artist[source]?.trim();
    if (!id) return null;
    try {
        const image = source === 'deezer'
            ? (await deezerProvider.getArtist(id))?.imageUrl
            : await spotifyProvider.getArtistImage(id);
        if (!image) return null;
        const url = new URL(image);
        return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
    } catch { return null; }
}
