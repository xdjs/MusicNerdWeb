import type { Score } from "@/lib/evals/Score";

/** 1 when a call finished inside the budget its site races it against (docs/llm.md,
 *  "Timeout" column), else 0: past the budget the user would have seen the timeout
 *  path, whatever the model went on to say. */
export function scoreWithinBudget(ms: number, budgetMs: number): Score<{ ms: number; budgetMs: number }> {
    return {
        name: "within_budget",
        score: ms <= budgetMs ? 1 : 0,
        metadata: { ms, budgetMs },
    };
}
