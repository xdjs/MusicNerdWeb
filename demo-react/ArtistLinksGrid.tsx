import { Artist, UrlMap } from '@/server/db/DbTypes';
import { getArtistLinks } from '@/server/utils/queries/artistQueries';
import { getProfileLinks, orderProfileLinks } from '@/lib/artist/artistProfileLinks';
import SortableArtistLinks from '@/app/_components/SortableArtistLinks';
import fixture from './fixture.json';

interface ArtistLinksGridProps {
    isMonetized: boolean;
    artist: Artist;
    availableLinks: UrlMap[];
    canEdit?: boolean;
    hasSupplementalLinks?: boolean;
}

export default function ArtistLinksGrid({ isMonetized, artist, canEdit = false, hasSupplementalLinks = false }: ArtistLinksGridProps) {
    const section = isMonetized ? 'support' : 'links';
    const links = orderProfileLinks(getProfileLinks(artist, fixture.artistLinks.filter(l=>(artist as any)[l.siteName]).map(l=>({...fixture.urlMapList.find(m=>m.siteName===l.siteName),siteName:l.siteName,artistUrl:l.href,cardPlatformName:l.label,siteImage:l.iconSrc})) as any, section), artist.linkOrder?.[section]);
    if (!links.length && hasSupplementalLinks) return null;
    if (!links.length) return <p className="text-sm text-muted-foreground">{isMonetized ? 'No support links yet.' : 'No links yet — help out by adding some!'}</p>;
    return <SortableArtistLinks key={`${artist.id}:${section}`} artistId={artist.id} section={section} links={links} canEdit={canEdit} />;
}
