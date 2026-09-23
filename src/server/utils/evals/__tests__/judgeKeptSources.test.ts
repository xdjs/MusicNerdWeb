// @ts-nocheck
import { jest } from "@jest/globals";

const generateObject = jest.fn();
jest.mock("@/server/lib/ai/generateObject", () => ({ generateObject }));
jest.mock("@/server/lib/ai/models", () => ({ MODEL_JUDGE: "google/gemini-2.5-pro" }));

const CASE = {
    key: "pete", id: "a1", name: "Pete Rango", seed: [], minSources: 9, forbidHosts: [], expectedProfiles: [],
    expect: { instagram: "p3t3rango", bandcamp: "peterango" },
    note: "Namesake-dense: a film soundtrack and two famous Petes.",
};
const SOURCES = [
    { url: "https://peterango.com/", title: "Pete Rango", snippet: "Producer from Richmond" },
    { url: "https://screenrant.com/rango", title: "Rango soundtrack", snippet: null },
];

describe("judgeKeptSources", () => {
    beforeEach(() => { jest.resetModules(); generateObject.mockReset(); });

    it("makes no model call when nothing was kept", async () => {
        const { judgeKeptSources } = await import("@/server/utils/evals/judgeKeptSources");
        await expect(judgeKeptSources(CASE, [])).resolves.toEqual([]);
        expect(generateObject).not.toHaveBeenCalled();
    });

    it("asks the judge model once, at temperature 0, with the artist's identity and every source", async () => {
        generateObject.mockResolvedValue({ output: { verdicts: [
            { index: 1, aboutArtist: true, kind: "own", reason: "His own site" },
            { index: 2, aboutArtist: false, kind: "coverage", reason: "The film" },
        ] } });
        const { judgeKeptSources } = await import("@/server/utils/evals/judgeKeptSources");

        const verdicts = await judgeKeptSources(CASE, SOURCES);

        expect(generateObject).toHaveBeenCalledTimes(1);
        const call = generateObject.mock.calls[0][0];
        expect(call.model).toBe("google/gemini-2.5-pro");
        expect(call.temperature).toBe(0);
        expect(call.prompt).toContain("Pete Rango");
        expect(call.prompt).toContain("instagram: p3t3rango");
        expect(call.prompt).toContain("two famous Petes");
        expect(call.prompt).toContain("1. https://peterango.com/");
        expect(call.prompt).toContain("2. https://screenrant.com/rango");
        // The judge is told what counts as coverage, listing and own.
        expect(call.instructions).toMatch(/coverage/);
        expect(call.instructions).toMatch(/listing/);
        expect(verdicts).toEqual([
            { url: "https://peterango.com/", aboutArtist: true, kind: "own", reason: "His own site" },
            { url: "https://screenrant.com/rango", aboutArtist: false, kind: "coverage", reason: "The film" },
        ]);
    });

    it("counts a source the judge skipped as not about the artist, so an omission cannot flatter the score", async () => {
        generateObject.mockResolvedValue({ output: { verdicts: [{ index: 1, aboutArtist: true, kind: "own", reason: "His own site" }] } });
        const { judgeKeptSources } = await import("@/server/utils/evals/judgeKeptSources");

        const verdicts = await judgeKeptSources(CASE, SOURCES);

        expect(verdicts[1]).toEqual({ url: "https://screenrant.com/rango", aboutArtist: false, kind: "listing", reason: "no verdict from the judge" });
    });
});
