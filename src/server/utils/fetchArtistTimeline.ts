import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { extractInProcessAddress, inProcessProfileUrl, normalizeMoment, type Moment, type RawTimelineMoment } from '@/lib/inprocessTimeline';

/**
 * An artist's In Process moments for the Timeline section.
 *
 * Reads In Process's public timeline (no key; nothing in env.ts) and never throws
 * at its public boundary: any failure logs and returns [], the way webSearch.ts
 * does, so a profile view is never broken by In Process. Successful responses
 * (including a legitimately empty timeline) are cached per address for ten
 * minutes; failures are thrown inside the cached function so the cache never
 * stores them (a cached [] would blank the section for ten minutes after one
 * slow upstream call, which happened on the 2026-09-13 preview). Cold calls were
 * 3.7 s and warm 1.6 s that day, so the section must sit behind Suspense.
 *
 * The response carries each moment's metadata inline (name, image, content.mime),
 * so this is one round trip; there is no call to /api/metadata.
 *
 * Tracking issue: xdjs/MusicNerdWeb#1228.
 */

const TIMELINE_ENDPOINT = 'https://api.inprocess.world/api/timeline';
/** The section shows the newest moments, not the whole timeline. */
export const TIMELINE_LIMIT = 12;
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_SECONDS = 600;

/** Thrown inside the cached function so a failed call is never cached. Already logged. */
class TimelineUnavailable extends Error {}

function unavailable(message: string, detail?: unknown): never {
    console.error(`[inprocess] ${message}`, ...(detail === undefined ? [] : [detail]));
    throw new TimelineUnavailable(message);
}

async function fetchTimelineDirect(address: string): Promise<Moment[]> {
    const artistUrl = inProcessProfileUrl(address);
    const url = `${TIMELINE_ENDPOINT}?artist=${encodeURIComponent(address)}&limit=${TIMELINE_LIMIT}`;
    // One deadline covers the headers and the body: a slow body read is as much a
    // hang as a slow connect, so the timer stays armed until the JSON is in.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        let response: Response;
        try {
            response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
        } catch (e) {
            if (controller.signal.aborted) unavailable(`timeline timed out after ${REQUEST_TIMEOUT_MS} ms for ${address}`);
            unavailable(`timeline request failed for ${address}:`, e instanceof Error ? e.message : e);
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            unavailable(`timeline HTTP ${response.status} for ${address}: ${detail.slice(0, 200)}`);
        }
        let body: { moments?: unknown };
        try {
            body = await response.json();
        } catch (e) {
            if (controller.signal.aborted) unavailable(`timeline timed out after ${REQUEST_TIMEOUT_MS} ms for ${address}`);
            unavailable(`timeline returned unparseable JSON for ${address}:`, e);
        }
        if (!Array.isArray(body?.moments)) unavailable(`timeline response had no moments array for ${address}`);
        return body.moments
            // A null or non-object entry must not take the whole timeline down.
            .filter((raw): raw is RawTimelineMoment => typeof raw === 'object' && raw !== null)
            .map(raw => normalizeMoment(raw, address, artistUrl))
            .filter((moment): moment is Moment => moment !== null);
    } finally {
        clearTimeout(timer);
    }
}

const cachedTimeline = cachedOrDirect(fetchTimelineDirect, ['inprocess-artist-timeline-v1'], { revalidate: CACHE_SECONDS });

/**
 * Moments for the artist whose In Process link is stored in `artists.inprocess` (the
 * bare 0x address, or a full profile URL). Returns [] for anything else.
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
