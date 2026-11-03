import type { Artist, UrlMap } from '@/server/db/DbTypes';
import type { ArtistLink } from '@/server/utils/queries/artistQueries';
import { getProfileLinks, orderProfileLinks, type ProfileLink } from '@/lib/artist/artistProfileLinks';
import SortableArtistLinks from './SortableArtistLinks';

interface ArtistLinksGridProps {
    isMonetized: boolean;
    artist: Artist;
    /** The artist's saved links, as the page read them. */
    artistLinks: ArtistLink[];
    availableLinks: UrlMap[];
    hasSupplementalLinks?: boolean;
    supplementalLinks?: (ProfileLink & {sourceId?: string})[];
}

export default function ArtistLinksGrid({ isMonetized, artist, artistLinks, hasSupplementalLinks = false, supplementalLinks = [] }: ArtistLinksGridProps) {
    const section = isMonetized ? 'support' : 'links';
    const links = orderProfileLinks(getProfileLinks(artist, artistLinks, section), artist.linkOrder?.[section]);
    if (!links.length && !supplementalLinks.length && hasSupplementalLinks) return null;
    if (!links.length && !supplementalLinks.length) return <p className="text-sm text-muted-foreground">{isMonetized ? 'No support links yet.' : 'No links yet — help out by adding some!'}</p>;
    return <SortableArtistLinks key={`${artist.id}:${section}`} artistId={artist.id} section={section} links={links} supplementalLinks={supplementalLinks} />;
}
