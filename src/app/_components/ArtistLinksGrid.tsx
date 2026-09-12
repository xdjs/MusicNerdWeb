import { Artist, UrlMap } from '@/server/db/DbTypes';
import { getArtistLinks } from '@/server/utils/queries/artistQueries';
import { getProfileLinks, orderProfileLinks } from '@/lib/artistProfileLinks';
import SortableArtistLinks from './SortableArtistLinks';

interface ArtistLinksGridProps {
    isMonetized: boolean;
    artist: Artist;
    availableLinks: UrlMap[];
    canEdit?: boolean;
}

export default async function ArtistLinksGrid({ isMonetized, artist, canEdit = false }: ArtistLinksGridProps) {
    const section = isMonetized ? 'support' : 'links';
    const links = orderProfileLinks(getProfileLinks(artist, await getArtistLinks(artist), section), artist.linkOrder?.[section]);
    if (!links.length) return <p className="text-sm text-muted-foreground">{isMonetized ? 'No support links yet.' : 'No links yet — help out by adding some!'}</p>;
    return <SortableArtistLinks key={`${artist.id}:${section}`} artistId={artist.id} section={section} links={links} canEdit={canEdit} />;
}
