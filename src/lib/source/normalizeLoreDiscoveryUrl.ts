/** Search dedup key. Apple's `i` identifies an episode, unlike tracking params. */
export function normalizeLoreDiscoveryUrl(raw: string): string {
    try {
        const url = new URL(raw);
        const host = url.hostname.replace(/^www\./, "").toLowerCase();
        const path = url.pathname.replace(/\/+$/, "").toLowerCase();
        const episodeId = host === "podcasts.apple.com" ? url.searchParams.get("i") : null;
        return `${host}${path}${episodeId ? `?i=${episodeId}` : ""}`;
    } catch {
        return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
    }
}
