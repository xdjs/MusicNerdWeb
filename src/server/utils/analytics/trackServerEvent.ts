import { track } from '@vercel/analytics/server';
import type { AnalyticsEventName, AnalyticsEvents } from '@/lib/analytics/events';

/**
 * Sends one custom event from a route handler or server action. Vercel's `track` reads the
 * request headers and `waitUntil` from its request context; outside Vercel it logs and returns.
 * A request must never fail because of analytics, so this resolves whatever `track` does.
 */
export async function trackServerEvent<Name extends AnalyticsEventName>(name: Name, props: AnalyticsEvents[Name]): Promise<void> {
    try {
        await track(name, props);
    } catch (error) {
        console.error('[analytics] server track failed:', error);
    }
}
