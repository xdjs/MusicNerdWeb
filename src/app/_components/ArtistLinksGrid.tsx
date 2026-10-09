import { Artist, UrlMap } from '@/server/db/DbTypes';
import { getArtistLinks } from '@/server/utils/queries/artistQueries';
import { getProfileLinks, orderProfileLinks, type ProfileLink } from '@/lib/artist/artistProfileLinks';
import SortableArtistLinks from './SortableArtistLinks';

interface ArtistLinksGridProps {
    isMonetized: boolean;
    artist: Artist;
    availableLinks: UrlMap[];
    canEdit?: boolean;
    hasSupplementalLinks?: boolean;
    supplementalLinks?: ProfileLink[];
}

export default async function ArtistLinksGrid({ isMonetized, artist, canEdit = false, hasSupplementalLinks = false, supplementalLinks = [] }: ArtistLinksGridProps) {
    const section = isMonetized ? 'support' : 'links';
    const links = orderProfileLinks(getProfileLinks(artist, await getArtistLinks(artist), section), artist.linkOrder?.[section]);
    if (!links.length && !supplementalLinks.length && hasSupplementalLinks) return null;
    if (!links.length && !supplementalLinks.length) return <p className="text-sm text-muted-foreground">{isMonetized ? 'No support links yet.' : 'No links yet — help out by adding some!'}</p>;
    return <SortableArtistLinks key={`${artist.id}:${section}`} artistId={artist.id} section={section} links={links} supplementalLinks={supplementalLinks} canEdit={canEdit} />;
}
