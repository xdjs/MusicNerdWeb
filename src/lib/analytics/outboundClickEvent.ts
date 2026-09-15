import { outboundPlatform } from '@/lib/analytics/outboundPlatform';
import type { AnalyticsEvents } from '@/lib/analytics/events';

/**
 * The `outbound_click` event for a clicked anchor, or `null` when the link stays on the site.
 * `sectionId` is the enclosing `mn-*` profile section (the `id` attribute), if any.
 */
export function outboundClickEvent(href: string, sectionId: string | null, origin: string): AnalyticsEvents['outbound_click'] | null {
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
    const surface = sectionId?.startsWith('mn-') ? sectionId.slice(3) : 'page';
    return { platform, surface };
}
