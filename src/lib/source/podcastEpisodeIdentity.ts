/** Metadata captured while ingesting a podcast episode page. Never inferred from
 * a similar title or a listening service's unrelated episode ID. */
export interface PodcastEpisodeIdentity {
    podcastEpisodeKey: string;
    podcastShowTitle?: string;
    podcastEpisodeTitle?: string;
}

/** Only recognized episode pages may claim the unique Buzzsprout recording in
 * their HTML. If a page embeds multiple recordings, its identity is unknown. */
export function extractPodcastEpisodeIdentity(url: string, html: string): PodcastEpisodeIdentity | null {
    let provider: "apple" | "iheart";
    try {
        const parsed = new URL(url);
        if (parsed.hostname === "podcasts.apple.com" && parsed.searchParams.has("i") && /^\d+$/.test(parsed.searchParams.get("i") ?? "")) {
            provider = "apple";
        } else if ((parsed.hostname === "iheart.com" || parsed.hostname === "www.iheart.com")
            && /\/podcast\/[^/]+\/episode\/[^/]+/.test(parsed.pathname)) {
            provider = "iheart";
        } else {
            return null;
        }
    } catch {
        return null;
    }

    const recordings = new Set<string>();
    for (const match of html.matchAll(/https:\/\/(?:www\.)?buzzsprout\.com\/(\d+)\/episodes\/(\d+)[^\s"'<>\\]*/gi)) {
        recordings.add(`buzzsprout:${match[1]}:${match[2]}`);
        if (recordings.size > 1) return null;
    }
    if (recordings.size !== 1) return null;
    const [, showId, episodeId] = [...recordings][0].split(":");
    if (provider === "apple"
        && (!html.includes(`Buzzsprout-${episodeId}`)
            || !html.includes(`https://rss.buzzsprout.com/${showId}.rss`))) return null;

    const decode = (value: string) => value.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
        ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1];
    const rawTitle = ogTitle ? decode(ogTitle) : undefined;
    const series = provider === "apple"
        ? html.match(/"partOfSeries"\s*:\s*\{[^}]{0,500}"name"\s*:\s*"([^"\\]+)"/i)?.[1]
        : rawTitle?.match(/\s{2,}(.+?)\s*\|\s*iHeart$/i)?.[1];
    const episodeTitle = provider === "iheart" ? rawTitle?.replace(/\s{2,}.+?\s*\|\s*iHeart$/i, "").trim() : rawTitle;

    return {
        podcastEpisodeKey: [...recordings][0],
        podcastShowTitle: series ? decode(series) : undefined,
        podcastEpisodeTitle: episodeTitle || undefined,
    };
}
