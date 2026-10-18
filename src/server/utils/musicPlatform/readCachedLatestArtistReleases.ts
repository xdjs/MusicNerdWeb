import type { Artist } from '@/server/db/DbTypes';
import { catalogCacheReadScope } from './catalogCacheReadScope';
import { getLatestArtistReleases } from './latestReleases';

/** Read display-only catalogs; misses and revalidation cannot contact providers. */
export async function readCachedLatestArtistReleases(artist: Pick<Artist, 'deezer' | 'spotify'>) {
    return catalogCacheReadScope.run(true, () => getLatestArtistReleases(artist));
}
