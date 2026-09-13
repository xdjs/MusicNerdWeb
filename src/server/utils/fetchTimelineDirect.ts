import { inProcessProfileUrl } from '@/lib/inProcessProfileUrl';
import { normalizeMoment } from '@/lib/normalizeMoment';
import type { Moment, RawTimelineMoment } from '@/lib/inprocessTimeline';
import { unavailable } from '@/server/utils/unavailable';

const TIMELINE_ENDPOINT = 'https://api.inprocess.world/api/timeline';
/** The section shows the newest moments, not the whole timeline. */
export const TIMELINE_LIMIT = 12;
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * One uncached call to In Process's public timeline for an address. Throws
 * TimelineUnavailable (already logged) on any failure so the caller's cache never
 * stores it; returns [] only for a genuinely empty timeline. One deadline covers
 * the headers and the body: a stalled body read is as much a hang as a slow connect.
 */
export async function fetchTimelineDirect(address: string): Promise<Moment[]> {
    const artistUrl = inProcessProfileUrl(address);
    const url = `${TIMELINE_ENDPOINT}?artist=${encodeURIComponent(address)}&limit=${TIMELINE_LIMIT}`;
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
