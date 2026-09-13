import { TimelineUnavailable } from '@/server/utils/TimelineUnavailable';

/** Log the reason, then throw TimelineUnavailable so the cache layer never stores the failure. */
export function unavailable(message: string, detail?: unknown): never {
    console.error(`[inprocess] ${message}`, ...(detail === undefined ? [] : [detail]));
    throw new TimelineUnavailable(message);
}
