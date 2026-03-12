import { openai } from "@/server/lib/openai";
import { insertVaultSource } from "./dashboardQueries";
import { getArtistById } from "./artistQueries";

interface WebSearchResult {
    url: string;
    title: string;
    snippet: string;
    type: string;
}

/**
 * Uses OpenAI web search to find articles/interviews/reviews about an artist,
 * then inserts them as pending vault sources.
 */
export async function searchAndPopulateVault(artistId: string): Promise<number> {
    const artist = await getArtistById(artistId);
    if (!artist) return 0;

    const artistName = artist.name ?? "Unknown Artist";

    // Build identity context so OpenAI knows exactly who this artist is
    const identityParts: string[] = [];
    if (artist.spotify) identityParts.push(`Spotify artist ID: ${artist.spotify}`);
    if (artist.instagram) identityParts.push(`Instagram: @${artist.instagram}`);
    if (artist.x) identityParts.push(`X/Twitter: @${artist.x}`);
    if (artist.youtube) identityParts.push(`YouTube: ${artist.youtube}`);
    if (artist.soundcloud) identityParts.push(`SoundCloud: ${artist.soundcloud}`);
    if (artist.bandcamp) identityParts.push(`Bandcamp: ${artist.bandcamp}`);

    const identityContext = identityParts.length > 0
        ? `\n\nThis artist's known profiles:\n${identityParts.join("\n")}`
        : "";

    try {
        const response = await openai.responses.create({
            model: "gpt-4o",
            tools: [{ type: "web_search_preview" }],
            input: [
                {
                    role: "system",
                    content: "You are a music research assistant. You search the web for articles, interviews, reviews, and content specifically about a given music artist. You must be precise — only return results that are directly about the specified artist, not about other artists or people with similar names."
                },
                {
                    role: "user",
                    content: `Search the web for articles, interviews, reviews, profiles, and notable content specifically about the music artist "${artistName}".${identityContext}

IMPORTANT: Every result MUST be specifically about "${artistName}" the music artist. Do NOT include results about other people, bands, or websites that happen to share a similar name.

Search for:
- "${artistName}" music artist interview
- "${artistName}" music review
- "${artistName}" artist profile
- "${artistName}" new music

Find up to 8 high-quality results. For each result, provide:
- The exact URL (must be a real, working URL you found via web search)
- The article title
- A 1-2 sentence description of the content
- The type: "article", "interview", "review", "news", or "profile"

Return ONLY a JSON array in this format, no other text:
[{"url": "...", "title": "...", "snippet": "...", "type": "..."}]

If you cannot find any results specifically about this artist, return an empty array: []`
                }
            ],
        });

        const outputText = response.output_text ?? "";
        console.log(`[vaultWebSearch] Raw response for "${artistName}":`, outputText.slice(0, 500));

        // Extract JSON array from the response
        const jsonMatch = outputText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("[vaultWebSearch] No JSON array found in response");
            return 0;
        }

        let results: WebSearchResult[];
        try {
            results = JSON.parse(jsonMatch[0]);
        } catch {
            console.error("[vaultWebSearch] Failed to parse JSON:", jsonMatch[0].slice(0, 200));
            return 0;
        }

        if (!Array.isArray(results) || results.length === 0) return 0;

        // Insert each result as a pending vault source
        let inserted = 0;
        for (const result of results) {
            if (!result.url || !result.title) continue;
            try {
                await insertVaultSource({
                    artistId,
                    url: result.url,
                    title: result.title,
                    snippet: result.snippet ?? "",
                    type: result.type ?? "article",
                    status: "pending",
                });
                inserted++;
            } catch (e) {
                console.error("[vaultWebSearch] Failed to insert source:", result.url, e);
            }
        }

        console.log(`[vaultWebSearch] Inserted ${inserted} sources for "${artistName}"`);
        return inserted;
    } catch (error: unknown) {
        const err = error as { status?: number; message?: string; code?: string };
        console.error("[vaultWebSearch] Error searching for artist:", {
            message: err.message,
            status: err.status,
            code: err.code,
            full: error,
        });
        return 0;
    }
}
