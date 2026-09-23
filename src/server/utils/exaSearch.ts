import { EXA_API_KEY } from "@/env";
import type { ProviderOutcome, ResolvedWebSearchOptions, WebSearchResult } from "@/server/utils/webSearch";

const EXA_ENDPOINT = "https://api.exa.ai/search";

/** Same hard budget as the Tavily backend: up to eight discovery searches run in
 *  parallel, so a slow provider must not eat discovery's overall budget. */
const REQUEST_TIMEOUT_MS = 6_000;

/** Highlight length per result. Tavily's `content` is a short extract of the same
 *  size; the vault's relevance check reads it as evidence next to the title. */
const HIGHLIGHT_CHARACTERS = 600;

interface ExaResultRow {
    title?: unknown;
    url?: unknown;
    highlights?: unknown;
}

/**
 * Exa backend for `webSearch`: `POST https://api.exa.ai/search`. Shape verified against
 * Exa's API reference (exa.ai/docs/reference/search) on 2026-09-23, not from memory:
 * - auth: the `x-api-key` header.
 * - request is camelCase: `query`, `numResults`, `includeDomains` (bare hostnames, match
 *   subdomains), and `contents.highlights` because page text is not returned by default.
 *   `type` is left at Exa's default, `auto`.
 * - response: `results[]` with `{ title, url, highlights: string[], ... }`. The highlights
 *   are joined into `snippet` here so callers never see Exa's field names.
 * Never throws: every failure returns no results and names its kind for the log line.
 */
export async function exaSearch(query: string, opts: ResolvedWebSearchOptions): Promise<ProviderOutcome> {
    const res = await fetch(EXA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": EXA_API_KEY },
        body: JSON.stringify({
            query,
            numResults: opts.maxResults,
            ...(opts.includeDomains.length ? { includeDomains: opts.includeDomains } : {}),
            contents: { highlights: { maxCharacters: HIGHLIGHT_CHARACTERS } },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => null);

    if (!res) {
        console.error(`[webSearch] Exa did not respond (timeout or network) for: ${query.slice(0, 80)}`);
        return { results: [], error: "no_response" };
    }
    if (!res.ok) {
        // Exa's body carries the reason: 401 bad key, 402 out of credits, 429 rate limit.
        const detail = await res.text().catch(() => "");
        console.error(`[webSearch] Exa HTTP ${res.status} for "${query.slice(0, 60)}": ${detail.slice(0, 200)}`);
        return { results: [], error: `http_${res.status}` };
    }

    let body: { results?: ExaResultRow[] };
    try {
        body = await res.json();
    } catch (e) {
        console.error(`[webSearch] Exa returned unparseable JSON for "${query.slice(0, 60)}":`, e);
        return { results: [], error: "unparseable" };
    }
    if (!Array.isArray(body?.results)) {
        console.error(`[webSearch] Exa response had no results array for "${query.slice(0, 60)}"`);
        return { results: [], error: "no_results" };
    }

    const results: WebSearchResult[] = [];
    for (const row of body.results) {
        if (typeof row?.url !== "string" || !row.url) continue;
        results.push({
            url: row.url,
            title: typeof row.title === "string" ? row.title : "",
            snippet: Array.isArray(row.highlights) ? row.highlights.filter(h => typeof h === "string").join(" … ") : "",
        });
    }
    return { results };
}
