import { scoreHandles } from "@/lib/evals/scorers/scoreHandles";

// The rules are the research benchmark's (scripts/research-benchmark.ts): a
// case-insensitive match against any accepted handle is correct, nothing is
// missed, anything else is wrong, and a handle that belongs to another artist
// is wrong even on a platform we expected nothing for.

describe("scoreHandles", () => {
    it("scores the fraction of known handles found, case-insensitively", () => {
        const result = scoreHandles(
            { instagram: "P3T3RANGO", x: "p3t3rango", youtube: null },
            { instagram: "p3t3rango", x: "p3t3rango", youtube: "peterango" },
        );
        expect(result.name).toBe("handles");
        expect(result.score).toBeCloseTo(2 / 3);
        expect(result.metadata).toEqual({
            known: 3,
            correct: ["instagram=P3T3RANGO", "x=p3t3rango"],
            wrong: [],
            missed: ["youtube=peterango"],
        });
    });

    it("accepts any of several genuine handles and reports the one found", () => {
        const result = scoreHandles({ instagram: "blackdave.xyz" }, { instagram: ["blackdavemk2", "blackdave.xyz"] });
        expect(result.score).toBe(1);
        expect(result.metadata.correct).toEqual(["instagram=blackdave.xyz"]);
    });

    it("counts somebody else's handle as worse than a missing one", () => {
        const result = scoreHandles(
            { instagram: "someoneelse", x: "p3t3rango" },
            { instagram: "p3t3rango", x: "p3t3rango" },
        );
        expect(result.score).toBe(0);
        expect(result.metadata.wrong).toEqual(["instagram=someoneelse (want p3t3rango)"]);
    });

    it("flags a forbidden handle on an unexpected platform as wrong, once", () => {
        // Pharaoh Sistare has no Twitch; a run that gives her one is wrong.
        const result = scoreHandles(
            { instagram: "pharaohsistare", twitch: "pharaohsistare" },
            { instagram: "pharaohsistare" },
            { twitch: ["pharaohsistare"] },
        );
        expect(result.score).toBe(0);
        expect(result.metadata.wrong).toEqual(["twitch=pharaohsistare (belongs to another artist)"]);
    });

    it("explains rather than double-counts a wrong handle that is also forbidden", () => {
        const result = scoreHandles(
            { instagram: "blackdaveblackdave" },
            { instagram: "blackdave.xyz" },
            { instagram: ["blackdaveblackdave"] },
        );
        expect(result.metadata.wrong).toEqual(["instagram=blackdaveblackdave (want blackdave.xyz) — belongs to another artist"]);
        expect(result.metadata.wrong).toHaveLength(1);
    });

    it("scores a case with nothing expected on whether anything wrong was stored", () => {
        expect(scoreHandles({}, {}).score).toBe(1);
        expect(scoreHandles({ x: "BlackDave" }, {}, { x: ["BlackDave"] }).score).toBe(0);
    });
});
