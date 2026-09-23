/**
 * Provider-agnostic web search — the seam that lets discovery's last-resort
 * tier (see `profileDiscovery.ts` tier 4) ask a REAL search API "who holds
 * this handle on this domain" instead of asking a grounded LLM to decide
 * whether/what to search. Measured live, that Gemini-`googleSearch` shape
 * timed out on most platforms and, when it did answer, confidently returned
 * an unrelated page (see the web-search report) — a model deciding whether
 * to search is not a substitute for an actual search API.
 *
 * Two backends, selected by `WEB_SEARCH_PROVIDER`: **Exa** (`exaSearch.ts`), the
 * default since 2026-09-23 by team decision (#1265), and **Tavily** (below), kept as
 * the rollback until Exa's numbers on `main` match the branch that switched. An
 * unknown provider degrades to `[]`, same as every other failure mode here.
 *
 * NEVER throws. No API key configured for the selected provider, an unknown
 * provider, a network failure, a non-OK HTTP response, or an unparseable
 * body all degrade to `[]` — the same "a discovery failure can never break
 * the onboarding turn" contract every tier in `profileDiscovery.ts` already
 * follows.
 */
import { EXA_API_KEY, TAVILY_API_KEY, WEB_SEARCH_PROVIDER } from "@/env";
import { formatWebSearchLog } from "@/lib/search/formatWebSearchLog";
import { exaSearch } from "@/server/utils/exaSearch";

export interface WebSearchResult {
    url: string;
    title: string;
    snippet: string;
}

export interface WebSearchOptions {
    /** Domains to restrict results to (e.g. `["instagram.com"]`). Passed
     *  through untouched to the provider's own domain-filter field. */
    includeDomains?: string[];
    maxResults?: number;
}

export type ResolvedWebSearchOptions = Required<WebSearchOptions>;

/** What a provider hands back to `webSearch`: the rows, and on a degrade-to-`[]`
 *  path the kind of failure, which goes on the `[websearch]` log line. */
export type ProviderOutcome = { results: WebSearchResult[]; error?: string };

/** Per-request hard timeout — mirrors `linkPreview.ts`'s `fetchWithTimeout`
 *  pattern (a short AbortController timeout, never throws). Kept short so a
 *  slow/hung provider can't eat into discovery's overall budget when up to
 *  8 platform searches are in flight in parallel (see profileDiscovery.ts's
 *  tier 4). */
const REQUEST_TIMEOUT_MS = 6_000;

const DEFAULT_MAX_RESULTS = 5;

/** fetch() with a hard AbortController timeout. Returns null (never throws)
 *  on any network failure, abort, or non-fetch exception — same contract as
 *  `linkPreview.ts`'s helper of the same shape. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

interface TavilyResultRow {
    title?: unknown;
    url?: unknown;
    content?: unknown;
}

interface TavilyResponseBody {
    results?: TavilyResultRow[];
}

/** Tavily backend — `POST https://api.tavily.com/search`. Request/response
 *  shape verified against Tavily's current documented API reference
 *  (docs.tavily.com/documentation/api-reference/endpoint/search), NOT
 *  guessed:
 *  - auth: `Authorization: Bearer tvly-...` header (not an `api_key` body field).
 *  - request body is snake_case: `query`, `include_domains`, `max_results`.
 *    (`WebSearchResult` stays camelCase — the snake_case here is Tavily's
 *    wire format, not this module's public shape.)
 *  - response: `results[]` with `{ title, url, content, score, ... }` — note
 *    `content`, not `snippet`; the rename to `snippet` happens at this
 *    boundary so callers never need to know Tavily's field name. */
async function tavilySearch(query: string, opts: ResolvedWebSearchOptions): Promise<ProviderOutcome> {
    const res = await fetchWithTimeout(TAVILY_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
            query,
            include_domains: opts.includeDomains,
            max_results: opts.maxResults,
        }),
    });
    // EVERY FAILURE HERE WAS SILENT. Each of these returned [] and said
    // nothing, which is indistinguishable from "the web has nothing about this
    // artist" — so a rate limit, an expired key or a spent quota would degrade
    // onboarding to no sources and no About with no trace anywhere. Tavily's
    // plan limit is a real ceiling and this is how it will announce itself.
    if (!res) {
        console.error(`[webSearch] Tavily did not respond (timeout or network) for: ${query.slice(0, 80)}`);
        return { results: [], error: "no_response" };
    }
    if (!res.ok) {
        // The body carries Tavily's reason — 401 bad key, 429 rate limit, 432
        // plan exhausted. Worth having in the log rather than just the status.
        const detail = await res.text().catch(() => "");
        console.error(`[webSearch] Tavily HTTP ${res.status} for "${query.slice(0, 60)}": ${detail.slice(0, 200)}`);
        return { results: [], error: `http_${res.status}` };
    }

    let body: TavilyResponseBody;
    try {
        body = await res.json();
    } catch (e) {
        console.error(`[webSearch] Tavily returned unparseable JSON for "${query.slice(0, 60)}":`, e);
        return { results: [], error: "unparseable" };
    }
    if (!Array.isArray(body?.results)) {
        console.error(`[webSearch] Tavily response had no results array for "${query.slice(0, 60)}"`);
        return { results: [], error: "no_results" };
    }

    const out: WebSearchResult[] = [];
    for (const row of body.results) {
        if (typeof row?.url !== "string" || !row.url) continue;
        out.push({
            url: row.url,
            title: typeof row.title === "string" ? row.title : "",
            snippet: typeof row.content === "string" ? row.content : "",
        });
    }
    return { results: out };
}

/** Latched so the missing-key warning is said once, not once per parallel
 *  call. Module scope, so it resets with the process — a redeploy says it
 *  again, which is when somebody is likely to be reading. */
let warnedNoKey = false;

/** Backend registry, selected by `WEB_SEARCH_PROVIDER` (code default "exa", src/env.ts).
 *  Adding a provider is one entry here plus its key in `API_KEYS`; no caller changes. */
const PROVIDERS: Record<string, (query: string, opts: ResolvedWebSearchOptions) => Promise<ProviderOutcome>> = {
    exa: exaSearch,
    tavily: tavilySearch,
};

/** Each provider's key and the variable it comes from, for the missing-key path. */
const API_KEYS: Record<string, { name: string; value: string }> = {
    exa: { name: "EXA_API_KEY", value: EXA_API_KEY },
    tavily: { name: "TAVILY_API_KEY", value: TAVILY_API_KEY },
};

/** Search the web, provider-agnostic. NEVER throws.
 *  - No API key configured for the selected provider -> returns `[]`
 *    immediately, no network call — this is the expected "not configured
 *    yet" path in any environment without `EXA_API_KEY` (or, on the rollback,
 *    `TAVILY_API_KEY`) set.
 *  - Unknown `WEB_SEARCH_PROVIDER`, or a network/HTTP/parse failure inside
 *    the provider -> logs and returns `[]`.
 */
export async function webSearch(query: string, opts?: WebSearchOptions): Promise<WebSearchResult[]> {
    const provider = WEB_SEARCH_PROVIDER || "exa";
    const started = Date.now();
    const domains = opts?.includeDomains?.length ?? 0;
    // One line per call, success or not (#1329 row 2c): a provider comparison
    // counts searches and results off the run log.
    const done = ({ results, error }: ProviderOutcome): WebSearchResult[] => {
        console.log(formatWebSearchLog({ provider, query, domains, results: results.length, ms: Date.now() - started, error }));
        return results;
    };

    const key = API_KEYS[provider];
    if (key && !key.value) {
        // Expected in an environment that has not configured it, and
        // catastrophic in one that thinks it has: no key means no sources, no
        // knowledge document and no About, with nothing in the logs to say so.
        //
        // ONCE PER PROCESS. Discovery calls this up to eight times in parallel
        // per pass, so warning on every call buried the log in identical,
        // non-actionable lines on any preview deploy without the key.
        if (!warnedNoKey) {
            warnedNoKey = true;
            console.warn(`[webSearch] No ${key.name} — web search is OFF. Discovery loses its last-resort tier and the vault finds no sources.`);
        }
        return done({ results: [], error: "no_key" });
    }

    const run = PROVIDERS[provider];
    if (!run) {
        console.error(`[webSearch] unknown WEB_SEARCH_PROVIDER "${provider}"`);
        return done({ results: [], error: "unknown_provider" });
    }

    const resolvedOpts: ResolvedWebSearchOptions = {
        includeDomains: opts?.includeDomains ?? [],
        maxResults: opts?.maxResults ?? DEFAULT_MAX_RESULTS,
    };

    try {
        return done(await run(query, resolvedOpts));
    } catch (e) {
        console.error(`[webSearch] provider "${provider}" failed for query "${query}":`, e);
        return done({ results: [], error: "threw" });
    }
}
