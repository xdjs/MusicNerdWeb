/** Only Instagram's media hosts, never arbitrary URLs from scraped metadata.
 * Redirects are refused so an allowed host cannot redirect into our network. */
export function instagramMediaUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
        return ['cdninstagram.com', 'fbcdn.net'].some(host => url.hostname.endsWith(`.${host}`)) ? url.href : null;
    } catch { return null; }
}
