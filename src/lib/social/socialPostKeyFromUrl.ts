

/**
 * The Instagram shortcode of a `/p/<code>/` url: a stable id for a post that
 * no re-scrape can change.
 *
 * @param url - A post url.
 * @returns The shortcode, or a slug of the url when it has none.
 */
export function socialPostKeyFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const id = host === "tiktok.com" ? /^\/@[^/]+\/video\/(\d+)\/?$/.exec(parsed.pathname)?.[1]
      : ["x.com", "twitter.com"].includes(host) ? /^\/[^/]+\/status\/(\d+)\/?$/.exec(parsed.pathname)?.[1] : undefined;
    if (id) return `${host === "tiktok.com" ? "tiktok" : "x"}_${id}`;
  } catch { /* Legacy arbitrary identifiers retain their existing slug. */ }
  const m = url.match(/\/p\/([^/]+)\/?/);
  return m ? m[1] : url.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "x";
}
