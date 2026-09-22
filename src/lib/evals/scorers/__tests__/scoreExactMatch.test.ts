import { scoreExactMatch } from "@/lib/evals/scorers/scoreExactMatch";

describe("scoreExactMatch", () => {
    it("scores 1 when output and expected match after trimming", () => {
        expect(scoreExactMatch(" OK\n", "OK")).toEqual({ name: "exact_match", score: 1, metadata: { output: " OK\n", expected: "OK" } });
    });

    it("scores 0 on any other difference, including case", () => {
        expect(scoreExactMatch("ok", "OK").score).toBe(0);
        expect(scoreExactMatch("OK.", "OK").score).toBe(0);
        expect(scoreExactMatch("", "OK").score).toBe(0);
    });
});
