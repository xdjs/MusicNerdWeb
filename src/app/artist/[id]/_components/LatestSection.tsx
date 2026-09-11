import type { Artist } from '@/server/db/DbTypes';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import LatestCards from './LatestCards';

export default async function LatestSection({ artist, imageUrl }: { artist: Artist; imageUrl: string }) {
    const result = await getArtistLatest(artist);
    return <LatestCards artistName={artist.name ?? 'this artist'} artistImage={imageUrl} {...result} />;
}
