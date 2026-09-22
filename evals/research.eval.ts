import { Eval } from "braintrust";
import { MODEL_FLASH } from "@/server/lib/ai/models";
import { experimentName } from "@/lib/evals/experimentName";
import { RESEARCH_CASES, type ResearchCase } from "@/lib/evals/researchCases";
import { scoreHandles } from "@/lib/evals/scorers/scoreHandles";
import { scoreForbiddenHosts } from "@/lib/evals/scorers/scoreForbiddenHosts";
import { scoreLinkPlacement } from "@/lib/evals/scorers/scoreLinkPlacement";
import { runResearchCase, type ResearchResult } from "@/server/utils/evals/runResearchCase";

/**
 * Research suite: does a change to the research pipeline make it better or worse?
 *
 * Each case is an artist on the staging database, reset to the state one actually
 * arrives in (the DSP ids and nothing else), run through profile discovery and the
 * source search the way onboarding runs them, and scored against hand-verified
 * ground truth: handles found and wrong, namesake and blocked hosts kept, and where
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

type Expected = Pick<ResearchCase, "expect" | "forbidHosts" | "forbidHandles" | "expectedProfiles">;

Eval("music-nerd", {
    experimentName: experimentName("research", MODEL, SHA),
    metadata: { suite: "research", model: MODEL, sha: SHA },
    maxConcurrency: 1,
    data: () => RESEARCH_CASES.map(c => ({
        input: c,
        expected: { expect: c.expect, forbidHosts: c.forbidHosts, forbidHandles: c.forbidHandles, expectedProfiles: c.expectedProfiles } satisfies Expected,
        metadata: { key: c.key, name: c.name, seed: c.seed, note: c.note },
    })),
    task: async (input: ResearchCase): Promise<ResearchResult> => runResearchCase(input),
    scores: [
        ({ output, expected }) => scoreHandles(output.handles, expected.expect, expected.forbidHandles),
        ({ output, expected }) => scoreForbiddenHosts(output.sourceUrls, expected.forbidHosts),
        ({ output, expected }) => scoreLinkPlacement({ links: output.links, loreProfiles: output.loreProfiles, expectedProfiles: expected.expectedProfiles }),
    ],
});
