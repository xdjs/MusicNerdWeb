import type { Score } from "@/lib/evals/Score";

type SourcesKeptMetadata = { kept: number; floor: number };

/**
 * Source recall against a per-case floor: `min(1, kept / floor)`. `scoreForbiddenHosts`
 * judges precision only, so a search provider that returns nothing scores 100% there;
 * this is the score that goes red when it does. The floor is what the pipeline kept for
 * the case on the research benchmark's 2026-08-31 run; a case with no floor scores 1.
 */
export function scoreSourcesKept(urls: string[], floor: number): Score<SourcesKeptMetadata> {
    return {
        name: "sources_kept",
        score: floor > 0 ? Math.min(1, urls.length / floor) : 1,
        metadata: { kept: urls.length, floor },
    };
}
