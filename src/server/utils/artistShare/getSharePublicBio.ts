import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { isRealBio } from '@/lib/bio/bioConstants';

/** Matches artist-page metadata's public gate; never reads private Lore or sources. */
export async function getSharePublicBio(artist: { id: string; bio?: string | null }): Promise<string | null> {
    const claim = await getLoreClaimGeneration(artist.id);
    if (claim) return isRealBio(artist.bio) ? artist.bio! : null;
    const about = await getPublicArtistAbout(artist.id);
    return about && isRealBio(about.bio) ? about.bio : null;
}
