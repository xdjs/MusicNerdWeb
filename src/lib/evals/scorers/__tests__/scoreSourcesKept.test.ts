import { scoreSourcesKept } from "@/lib/evals/scorers/scoreSourcesKept";

describe("scoreSourcesKept", () => {
    it("scores 0 when research kept nothing", () => {
        expect(scoreSourcesKept([], 9)).toEqual({ name: "sources_kept", score: 0, metadata: { kept: 0, floor: 9 } });
    });

    it("scores 1 at the floor", () => {
        expect(scoreSourcesKept(["a", "b"], 2).score).toBe(1);
    });

    it("caps at 1 above the floor", () => {
        expect(scoreSourcesKept(["a", "b", "c"], 2).score).toBe(1);
    });

    it("scores the fraction of the floor below it", () => {
        expect(scoreSourcesKept(["a", "b"], 4).score).toBe(0.5);
    });

    it("scores 1 when the case has no floor", () => {
        expect(scoreSourcesKept([], 0).score).toBe(1);
    });
});
