import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { extractInProcessAddress } from '@/lib/inprocess/extractInProcessAddress';
import type { Moment } from '@/lib/inprocess/inprocessTimeline';
import { fetchTimelineDirect } from '@/server/utils/fetchTimelineDirect';
import { TimelineUnavailable } from '@/server/utils/TimelineUnavailable';

/**
 * An artist's In Process moments for the Latest section: the cached, never-throwing
 * boundary over fetchTimelineDirect.
 *
 * Successful responses (including a legitimately empty timeline) are cached per
 * address for ten minutes. Failures are thrown inside the cached function, which
 * unstable_cache does not store, so one slow upstream call cannot blank the cards
 * for ten minutes (it did on the 2026-09-13 preview). Cold calls were 3.7 s and warm
 * 1.6 s that day; Latest sits behind Suspense. Public endpoint, no key,
 * nothing in env.ts.
 *
 * Tracking issue: xdjs/MusicNerdWeb#1228.
 */

const CACHE_SECONDS = 600;

const cachedTimeline = cachedOrDirect(fetchTimelineDirect, ['inprocess-artist-timeline-v1'], { revalidate: CACHE_SECONDS });

/**
 * Moments for the artist whose In Process link is stored in `artists.inprocess` (the
 * bare 0x address, or a full profile URL). Returns [] for anything else and on any failure.
 */
export async function fetchArtistTimeline(inprocess: string | null | undefined): Promise<Moment[]> {
    const address = extractInProcessAddress(inprocess);
    if (!address) return [];
    try {
        return await cachedTimeline(address);
    } catch (e) {
        // TimelineUnavailable was logged where it happened; anything else is the cache layer.
        if (!(e instanceof TimelineUnavailable)) console.error(`[inprocess] timeline cache failed for ${address}:`, e instanceof Error ? e.message : e);
        return [];
    }
}
