import type { Artist } from '@/server/db/DbTypes';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import { releaseListeningLinks, type ReleaseSource } from '@/lib/releaseListeningLinks';
import type { ProfileLink } from '@/lib/artistProfileLinks';
import LatestCards from './LatestCards';

export default async function LatestSection({ artist, imageUrl, sources = [], listenLinks = [] }: { artist: Artist; imageUrl: string; sources?: ReleaseSource[]; listenLinks?: ProfileLink[] }) {
    const result = await getArtistLatest(artist);
    const items = result.items.map(item => item.kind === 'release'
        ? { ...item, listeningLinks: releaseListeningLinks(item, artist.name ?? '', sources, listenLinks) } : item);
    return <LatestCards artistName={artist.name ?? 'this artist'} artistImage={imageUrl} unavailable={result.unavailable} items={items} artistListeningLinks={listenLinks} />;
}
