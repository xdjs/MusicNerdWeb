import type { Artist } from '@/server/db/DbTypes';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import { releaseListeningLinks, type ReleaseSource } from '@/lib/artist/releaseListeningLinks';
import type { ProfileLink } from '@/lib/artist/artistProfileLinks';
import LatestCards from './LatestCards';
import LatestRefreshControl from './LatestRefreshControl';

export default async function LatestSection({ artist, imageUrl, sources = [], listenLinks = [], canEdit = false }: { canEdit?: boolean; artist: Artist; imageUrl: string; sources?: ReleaseSource[]; listenLinks?: ProfileLink[] }) {
    const result = await getArtistLatest(artist);
    const items = result.items.map(item => item.kind === 'release'
        ? { ...item, listeningLinks: releaseListeningLinks(item, artist.name ?? '', sources, listenLinks) } : item);
    // Keyed by artist, as the hero and the rail are: client navigation between profiles
    // reuses this tree, and the gallery's filter, open dialog and scroll belong to one artist.
    return <LatestCards refreshControl={canEdit ? <LatestRefreshControl key={artist.id} artistId={artist.id} /> : undefined} key={artist.id} artistName={artist.name ?? 'this artist'} artistImage={imageUrl} unavailable={result.unavailable} items={items} artistListeningLinks={listenLinks} />;
}
