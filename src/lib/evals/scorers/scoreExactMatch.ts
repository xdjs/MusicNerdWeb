import type { Score } from "@/lib/evals/Score";

/** 1 when the output is the expected string after trimming, else 0. For the smoke
 *  suite and any site whose reply is a fixed token. */
export function scoreExactMatch(output: string, expected: string): Score<{ output: string; expected: string }> {
    return {
        name: "exact_match",
        score: output.trim() === expected.trim() ? 1 : 0,
        metadata: { output, expected },
    };
}
