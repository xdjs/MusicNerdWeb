/** Where the site is served from — metadata needs absolute URLs, pages don't. */
const SITE_ORIGIN = "https://musicnerd.net";

/**
 * Absolute form of a stored image value, for metadata (OG / Twitter cards),
 * which cannot resolve a relative path.
 *
 * Anything uploaded through /api/artist/profile-image is already an absolute
 * Supabase Storage URL. Older rows stored a site-relative path instead, so this
 * has to handle both rather than assume one shape.
 */
export function absoluteImageUrl(value: string, origin: string = SITE_ORIGIN): string {
    if (/^https?:\/\//i.test(value)) return value;
    return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}
