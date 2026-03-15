export interface PageContent {
    title: string;
    snippet?: string;
    extractedText: string | null;
}

/** Decode HTML entities (&#8217; → ', &amp; → &, etc.) */
function decodeEntities(str: string): string {
    return str
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, "\u201D")
        .replace(/&ldquo;/g, "\u201C")
        .replace(/&hellip;/g, "…");
}

/**
 * Fetch a URL and extract title, meta description, and body text.
 * Returns domain-based fallback title on failure.
 */
export async function fetchPageContent(url: string): Promise<PageContent> {
    let title = "Untitled Source";
    let snippet: string | undefined;
    let extractedText: string | null = null;

    try {
        const parsed = new URL(url);
        title = `Source from ${parsed.hostname.replace("www.", "")}`;

        const res = await fetch(url, {
            headers: { "User-Agent": "MusicNerdBot/1.0" },
            signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
            const html = await res.text();

            // Extract <title>
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (titleMatch?.[1]) title = decodeEntities(titleMatch[1].trim());

            // Extract meta description
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
            if (descMatch?.[1]) snippet = decodeEntities(descMatch[1].trim());

            // Extract og:description as fallback snippet
            if (!snippet) {
                const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
                    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
                if (ogMatch?.[1]) snippet = decodeEntities(ogMatch[1].trim());
            }

            // Extract body text (strip tags, collapse whitespace)
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch?.[1]) {
                const text = bodyMatch[1]
                    .replace(/<script[\s\S]*?<\/script>/gi, "")
                    .replace(/<style[\s\S]*?<\/style>/gi, "")
                    .replace(/<[^>]+>/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                if (text.length > 50) {
                    extractedText = text.slice(0, 5000);
                }
            }
        }
    } catch {
        // Fetch failed — return what we have
    }

    return { title, snippet, extractedText };
}
