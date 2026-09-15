import { outboundPlatform } from '@/lib/analytics/outboundPlatform';
import type { AnalyticsEvents } from '@/lib/analytics/events';

/**
 * The `outbound_click` event for a clicked anchor, or `null` when the link stays on the site.
 * `surface` comes from `outboundSurface`.
 */
export function outboundClickEvent(href: string, surface: string, origin: string): AnalyticsEvents['outbound_click'] | null {
    let url: URL;
    try {
        url = new URL(href, origin);
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.origin === origin) return null;

    const platform = outboundPlatform(url.href);
    if (!platform) return null;
    return { platform, surface };
}
