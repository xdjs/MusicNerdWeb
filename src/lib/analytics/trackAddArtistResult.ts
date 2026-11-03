import type { AddArtistResp } from '@/lib/artist/addArtistTypes';
import type { AnalyticsEvents } from '@/lib/analytics/events';
import { addArtistStep } from '@/lib/analytics/addArtistStep';
import { trackEvent } from '@/lib/analytics/trackEvent';

/** Sends `add_artist` for a resolved add; a possible duplicate sends nothing until the visitor chooses. */
export function trackAddArtistResult(surface: AnalyticsEvents['add_artist']['surface'], resp: Pick<AddArtistResp, 'status'>): void {
    const step = addArtistStep(resp);
    if (step) trackEvent('add_artist', { surface, step });
}
