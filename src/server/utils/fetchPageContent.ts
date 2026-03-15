export interface PageContent {
    title: string;
    snippet?: string;
    extractedText: string | null;
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
            if (titleMatch?.[1]) title = titleMatch[1].trim();

            // Extract meta description
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
            if (descMatch?.[1]) snippet = descMatch[1].trim();

            // Extract og:description as fallback snippet
            if (!snippet) {
                const ogMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
                    ?? html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
                if (ogMatch?.[1]) snippet = ogMatch[1].trim();
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
