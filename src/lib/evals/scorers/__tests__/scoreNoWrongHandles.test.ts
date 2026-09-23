import { scoreNoWrongHandles } from "@/lib/evals/scorers/scoreNoWrongHandles";

describe("scoreNoWrongHandles", () => {
    it("scores 1 when every stored handle is a known one or on a platform we know nothing about", () => {
        const result = scoreNoWrongHandles({ instagram: "p3t3rango", youtube: "peterango", tiktok: "anything" }, { instagram: "p3t3rango" });
        expect(result).toEqual({ name: "no_wrong_handles", score: 1, metadata: { wrong: [] } });
    });

    it("scores 1 when handles are only missing: a gap is not a stranger's account", () => {
        expect(scoreNoWrongHandles({}, { instagram: "p3t3rango", x: "p3t3rango" }).score).toBe(1);
    });

    it("scores 0 for one handle that is not the artist's, however many are right", () => {
        const result = scoreNoWrongHandles(
            { instagram: "brice", youtube: "dupesdidit" },
            { instagram: "dupesdidit", youtube: "dupesdidit" },
        );
        expect(result.score).toBe(0);
        expect(result.metadata.wrong).toEqual(["instagram=brice (want dupesdidit)"]);
    });

    it("scores 0 for a handle known to belong to another artist, on any platform", () => {
        const result = scoreNoWrongHandles({ twitch: "pharaohsistare" }, {}, { twitch: ["pharaohsistare"] });
        expect(result.score).toBe(0);
        expect(result.metadata.wrong).toEqual(["twitch=pharaohsistare (belongs to another artist)"]);
    });
});
