import { scoreWithinBudget } from "@/lib/evals/scorers/scoreWithinBudget";

describe("scoreWithinBudget", () => {
    it("scores 1 at or under the budget", () => {
        expect(scoreWithinBudget(14_999, 15_000)).toEqual({ name: "within_budget", score: 1, metadata: { ms: 14_999, budgetMs: 15_000 } });
        expect(scoreWithinBudget(15_000, 15_000).score).toBe(1);
    });

    it("scores 0 over the budget, which is where the site would have timed out", () => {
        expect(scoreWithinBudget(15_001, 15_000).score).toBe(0);
    });
});
