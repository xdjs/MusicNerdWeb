import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { extractInProcessAddress, normalizeMoment, type Moment, type RawTimelineMoment } from '@/lib/inprocessTimeline';

/**
 * An artist's In Process moments for the Timeline section.
 *
 * Reads In Process's public timeline (no key; nothing in env.ts) and never throws:
 * any failure logs and returns [], the way webSearch.ts does, so a profile view is
 * never broken by In Process. Cached per address for ten minutes. Cold calls were
 * 3.7 s and warm 1.6 s on 2026-09-13, so the section must sit behind Suspense.
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

async function fetchTimelineDirect(address: string): Promise<Moment[]> {
    const artistUrl = `https://www.inprocess.world/${address}`;
    const url = `${TIMELINE_ENDPOINT}?artist=${encodeURIComponent(address)}&limit=${TIMELINE_LIMIT}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
        response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    } catch (e) {
        console.error(`[inprocess] timeline request failed for ${address}:`, e instanceof Error ? e.message : e);
        return [];
    } finally {
        clearTimeout(timer);
    }
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        console.error(`[inprocess] timeline HTTP ${response.status} for ${address}: ${detail.slice(0, 200)}`);
        return [];
    }
    let body: { moments?: unknown };
    try {
        body = await response.json();
    } catch (e) {
        console.error(`[inprocess] timeline returned unparseable JSON for ${address}:`, e);
        return [];
    }
    if (!Array.isArray(body?.moments)) {
        console.error(`[inprocess] timeline response had no moments array for ${address}`);
        return [];
    }
    return (body.moments as RawTimelineMoment[])
        .map(raw => normalizeMoment(raw, address, artistUrl))
        .filter((moment): moment is Moment => moment !== null);
}

const cachedTimeline = cachedOrDirect(fetchTimelineDirect, ['inprocess-artist-timeline-v1'], { revalidate: CACHE_SECONDS });

/**
 * Moments for the artist whose In Process profile URL is stored in `artists.inprocess`.
 * Returns [] for anything that is not an In Process profile URL.
 */
export async function fetchArtistTimeline(inprocessUrl: string | null | undefined): Promise<Moment[]> {
    const address = extractInProcessAddress(inprocessUrl);
    if (!address) return [];
    return cachedTimeline(address);
}
