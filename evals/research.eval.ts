import { Eval } from "braintrust";
import { MODEL_FLASH } from "@/server/lib/ai/models";
import { experimentName } from "@/lib/evals/experimentName";
import { RESEARCH_CASES, type ResearchCase } from "@/lib/evals/researchCases";
import { scoreHandles } from "@/lib/evals/scorers/scoreHandles";
import { scoreNoWrongHandles } from "@/lib/evals/scorers/scoreNoWrongHandles";
import { scoreForbiddenHosts } from "@/lib/evals/scorers/scoreForbiddenHosts";
import { isBlockedSourceHost } from "@/lib/source/sourceAuthority";
import { scoreLinkPlacement } from "@/lib/evals/scorers/scoreLinkPlacement";
import { scoreSourcesKept } from "@/lib/evals/scorers/scoreSourcesKept";
import { scoreSourceRelevance, type SourceVerdict } from "@/lib/evals/scorers/scoreSourceRelevance";
import { runResearchCase, type ResearchResult } from "@/server/utils/evals/runResearchCase";
import { judgeKeptSources } from "@/server/utils/evals/judgeKeptSources";

/**
 * Research suite: does a change to the research pipeline make it better or worse?
 *
 * Each case is an artist on the staging database, reset to the state one actually
 * arrives in (the DSP ids and nothing else), run through profile discovery and the
 * source search the way onboarding runs them, and scored against hand-verified
 * ground truth: handles found and wrong, namesake and blocked hosts kept, enough sources
 * kept to beat the case's floor, and where
 * an artist-profile URL ended up (#1273, red on the baseline by design). No model
 * judges anything here. Ports scripts/research-benchmark.ts (docs/evals.md).
 *
 * Writes to the staging database. Refuses production. One case at a time.
 *
 *   npm run eval -- evals/research.eval.ts
 */

const SHA = process.env.GITHUB_SHA ?? "local";
/** The wrapper's default: what every ungrounded site runs on at this commit. */
const MODEL = MODEL_FLASH;

type Expected = Pick<ResearchCase, "expect" | "forbidHosts" | "forbidHandles" | "expectedProfiles" | "minSources">;

Eval("music-nerd", {
    experimentName: experimentName("research", MODEL, SHA),
    metadata: { suite: "research", model: MODEL, sha: SHA },
    maxConcurrency: 1,
    data: () => RESEARCH_CASES.map(c => ({
        input: c,
        expected: { expect: c.expect, forbidHosts: c.forbidHosts, forbidHandles: c.forbidHandles, expectedProfiles: c.expectedProfiles, minSources: c.minSources } satisfies Expected,
        metadata: { key: c.key, name: c.name, seed: c.seed, note: c.note },
    })),
    task: async (input: ResearchCase): Promise<ResearchResult & { sourceVerdicts: SourceVerdict[] }> => {
        const run = await runResearchCase(input);
        // The judge reads what research kept; its verdicts ride in the output so every
        // rejected source is visible next to the case in Braintrust.
        const result = { ...run, sourceVerdicts: await judgeKeptSources(input, run.sources) };
        const rejected = result.sourceVerdicts.filter(v => !v.aboutArtist).map(v => v.url);
        const namesakes = result.sourceUrls.filter(u => input.forbidHosts.some(h => u.includes(h)));
        const blocked = result.sourceUrls.filter(u => isBlockedSourceHost(u));
        // One line per case in the run log, so a reviewer can read a run without
        // opening Braintrust: what was found, where it went, how long it took.
        const handles = Object.entries(result.handles).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(" ") || "none";
        console.log(`[research] ${input.key} ${result.seconds}s discovery=${result.profileLinks}/${Object.keys(input.expect).length} alternatives=${result.alternatives}`
            + ` handles: ${handles} | sources=${result.sourceUrls.length} links=${result.links.join(",") || "none"} loreProfiles=${result.loreProfiles.join(",") || "none"}`
            + ` judgedNotAbout=${rejected.join(",") || "none"} namesakes=${namesakes.join(",") || "none"} blocked=${blocked.join(",") || "none"}`
            + `${result.discoveryError ? ` discoveryError=${result.discoveryError}` : ""}${result.vaultError ? ` vaultError=${result.vaultError}` : ""}`);
        return result;
    },
    scores: [
        // Discovery alone, then the whole flow: the same rules, read at two points.
        ({ output, expected }) => ({ ...scoreHandles(output.discoveryHandles, expected.expect, expected.forbidHandles), name: "discovery_handles" }),
        ({ output, expected }) => scoreHandles(output.handles, expected.expect, expected.forbidHandles),
        ({ output, expected }) => scoreNoWrongHandles(output.handles, expected.expect, expected.forbidHandles),
        ({ output, expected }) => scoreForbiddenHosts(output.sourceUrls, expected.forbidHosts),
        ({ output, expected }) => scoreSourcesKept(output.sourceUrls, expected.minSources),
        ({ output }) => scoreSourceRelevance(output.sourceVerdicts),
        ({ output, expected }) => scoreLinkPlacement({ links: output.links, loreProfiles: output.loreProfiles, expectedProfiles: expected.expectedProfiles }),
    ],
});
