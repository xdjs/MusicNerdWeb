import { track } from '@vercel/analytics';
import type { AnalyticsEventName, AnalyticsEvents } from '@/lib/analytics/events';

/** Sends one custom event from the browser. Analytics must never break a click, so this never throws. */
export function trackEvent<Name extends AnalyticsEventName>(name: Name, props: AnalyticsEvents[Name]): void {
    try {
        track(name, props);
    } catch (error) {
        console.error('[analytics] track failed:', error);
    }
}
