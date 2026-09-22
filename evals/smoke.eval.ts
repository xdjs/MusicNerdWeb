import { Eval } from "braintrust";
import { generateText } from "@/server/lib/ai/generateText";
import { MODEL_FLASH } from "@/server/lib/ai/models";
import { experimentName } from "@/lib/evals/experimentName";
import { scoreExactMatch } from "@/lib/evals/scorers/scoreExactMatch";

/**
 * Smoke suite: one model call through the app's own wrapper, scored without a
 * model. It proves the runner, the gateway credential and the Braintrust
 * credential are wired, and nothing about model quality. Run it first after
 * touching any of the three (docs/evals.md).
 *
 *   npm run eval -- evals/smoke.eval.ts
 */

const SHA = process.env.GITHUB_SHA ?? "local";
/** The wrapper's default: what every ungrounded site runs on at this commit. */
const MODEL = MODEL_FLASH;

Eval("music-nerd", {
    experimentName: experimentName("smoke", MODEL, SHA),
    metadata: { suite: "smoke", model: MODEL, sha: SHA },
    data: () => [{ input: "Reply with exactly the word OK and nothing else.", expected: "OK" }],
    task: async (input: string) => {
        const result = await generateText({ prompt: input, temperature: 0, thinkingBudget: 0 });
        return result.text;
    },
    scores: [({ output, expected }) => scoreExactMatch(output, expected ?? "")],
});
