import { isProductionDatabase } from "@/lib/evals/isProductionDatabase";
import type { ResearchCase } from "@/lib/evals/researchCases";
import { resetArtistForResearch } from "@/server/utils/evals/resetArtistForResearch";
import { restoreArtistDsp } from "@/server/utils/evals/restoreArtistDsp";
import { writeDiscoveredProfiles } from "@/server/utils/evals/writeDiscoveredProfiles";
import { readResearchOutcome, type ResearchOutcome } from "@/server/utils/evals/readResearchOutcome";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";

export type ResearchResult = ResearchOutcome & {
    /** Known handles profile discovery alone got right, before the source search, so a
     *  regression is attributable to the half that caused it. */
    profileLinks: number;
    alternatives: number;
    discoveryError: string | null;
    vaultError: string | null;
    seconds: number;
};

/**
 * The research suite's task: one artist through the flow they actually run, from the
 * state they arrive in. Reset to the seed DSP ids, profile discovery and its writes,
 * then the source search with the provisional platforms it needs, then read what the
 * page would show. Mirrors the loop in `scripts/research-benchmark.ts`. Refuses
 * production; restores the DSP ids whatever happened in between.
 */
export async function runResearchCase(researchCase: ResearchCase): Promise<ResearchResult> {
    if (isProductionDatabase(process.env.SUPABASE_DB_CONNECTION)) {
        throw new Error("REFUSING: SUPABASE_DB_CONNECTION points at production; the research suite resets artist state.");
    }
    const { id, seed, expect } = researchCase;
    const snapshot = await resetArtistForResearch(id, seed);
    const started = Date.now();
    try {
        const discovery = await writeDiscoveredProfiles(id);
        const afterDiscovery = await readResearchOutcome(id);
        const profileLinks = Object.entries(expect).filter(([platform, want]) => {
            const got = (afterDiscovery.handles[platform] ?? "").toLowerCase();
            return !!got && (Array.isArray(want) ? want : [want]).some(w => w.toLowerCase() === got);
        }).length;

        let vaultError: string | null = null;
        await searchAndPopulateVault(id, { provisionalSiteNames: discovery.provisionalSiteNames })
            .catch(error => { vaultError = error instanceof Error ? error.message : String(error); });
        const seconds = Math.round((Date.now() - started) / 100) / 10;

        const outcome = await readResearchOutcome(id);
        return { ...outcome, profileLinks, alternatives: discovery.alternatives, discoveryError: discovery.discoveryError, vaultError, seconds };
    } finally {
        await restoreArtistDsp(id, snapshot);
    }
}
