import type { AddArtistResp } from '@/lib/artist/addArtistTypes';
import type { AnalyticsEvents } from '@/lib/analytics/events';

/** How an add resolved, for `add_artist`; null while a possible duplicate waits on the visitor's choice. */
export function addArtistStep(resp: Pick<AddArtistResp, 'status'>): AnalyticsEvents['add_artist']['step'] | null {
    if (resp.status === 'possible_duplicate') return null;
    if (resp.status === 'success') return 'added';
    if (resp.status === 'exists') return 'exists';
    return 'error';
}
