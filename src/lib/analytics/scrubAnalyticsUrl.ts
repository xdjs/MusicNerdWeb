/** The only query parameters a page view may carry. Everything else is user input or plumbing. */
const KEPT_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);

/**
 * The URL to report to Vercel Web Analytics for a page view, or `null` to drop the event.
 * Allowlist, not blocklist: keeps `utm_*` in their original order, removes every other
 * query parameter and the hash, and drops admin traffic and anything that is not a URL.
 */
export function scrubAnalyticsUrl(url: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return null;
    }
    if (parsed.pathname === '/admin' || parsed.pathname.startsWith('/admin/')) return null;

    const kept = new URLSearchParams();
    parsed.searchParams.forEach((value, key) => {
        if (KEPT_PARAMS.has(key)) kept.append(key, value);
    });
    parsed.search = kept.toString();
    parsed.hash = '';
    return parsed.toString();
}
