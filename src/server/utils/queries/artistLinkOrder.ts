import { eq } from 'drizzle-orm';
import { artists } from '@/server/db/schema';
import { withScopedArtistWrite } from './ownershipWrites';
import type { LinkSection } from '@/lib/artistProfileLinks';

/** The artist lock also serializes saves in the two link groups. */
export async function saveArtistLinkOrder(artistId: string, section: LinkSection, order: string[]) {
    return withScopedArtistWrite(artistId, async tx => {
        const artist = await tx.query.artists.findFirst({ where: eq(artists.id, artistId) });
        if (!artist) return false;
        await tx.update(artists).set({ linkOrder: { ...artist.linkOrder, [section]: order } }).where(eq(artists.id, artistId));
        return true;
    });
}
