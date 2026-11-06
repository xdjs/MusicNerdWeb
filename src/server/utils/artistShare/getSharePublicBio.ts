import { getPublicSavedBio } from '@/server/utils/bio/getPublicSavedBio';
import { getPublicArtistAbout } from '@/server/utils/bio/getPublicArtistAbout';
import { isRealBio } from '@/lib/bio/bioConstants';

/** Same evidence-aware public projection used by profile content and metadata. */
export async function getSharePublicBio(artist: { id: string; bio?: string | null }): Promise<string | null> {
    const bio = await getPublicSavedBio(artist.id);
    if (bio) return bio;
    const about = await getPublicArtistAbout(artist.id);
    return about && isRealBio(about.bio) ? about.bio : null;
}
