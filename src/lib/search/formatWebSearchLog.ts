export type WebSearchLogFields = {
    provider: string;
    query: string;
    domains: number;
    results: number;
    ms: number;
    /** Why the call degraded to `[]`: `no_key`, `unknown_provider`, `no_response`,
     *  `http_<status>`, `unparseable`, `no_results`, `threw`. Absent on success. */
    error?: string;
};

/**
 * The one line `webSearch` logs per call, so a research run's log reads "N searches,
 * M results" per provider (#1329 row 2c). Carries the query's length, never its text.
 */
export function formatWebSearchLog({ provider, query, domains, results, ms, error }: WebSearchLogFields): string {
    return `[websearch] ${provider} q=${query.length} domains=${domains} results=${results} ${ms}ms${error ? ` error=${error}` : ""}`;
}
