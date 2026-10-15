import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { extractInProcessAddress } from '@/lib/inprocess/extractInProcessAddress';
import type { Moment } from '@/lib/inprocess/inprocessTimeline';
import { fetchTimelineDirect } from '@/server/utils/fetchTimelineDirect';

/** Cached bounded read that preserves the difference between empty and unavailable. */
export async function fetchCachedArtistTimeline(inprocess: string): Promise<Moment[]> {
    const address = extractInProcessAddress(inprocess);
    if (!address) throw new Error('Invalid In Process connection');
    return cachedOrDirect(fetchTimelineDirect, ['inprocess-artist-timeline-v2'], {
        revalidate: 600, tags: [`latest:inprocess:${address}`],
    })(address);
}
