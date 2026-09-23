// @ts-nocheck
import { jest } from "@jest/globals";

const isProductionDatabase = jest.fn();
const resetArtistForResearch = jest.fn();
const restoreArtistDsp = jest.fn();
const writeDiscoveredProfiles = jest.fn();
const readResearchOutcome = jest.fn();
const searchAndPopulateVault = jest.fn();
jest.mock("@/lib/evals/isProductionDatabase", () => ({ isProductionDatabase }));
jest.mock("@/server/utils/evals/resetArtistForResearch", () => ({ resetArtistForResearch }));
jest.mock("@/server/utils/evals/restoreArtistDsp", () => ({ restoreArtistDsp }));
jest.mock("@/server/utils/evals/writeDiscoveredProfiles", () => ({ writeDiscoveredProfiles }));
jest.mock("@/server/utils/evals/readResearchOutcome", () => ({ readResearchOutcome }));
jest.mock("@/server/utils/queries/vaultWebSearch", () => ({ searchAndPopulateVault }));

const CASE = {
    key: "pete", id: "50f23458-df64-4381-8042-7333e8b64531", name: "Pete Rango",
    seed: ["deezer"],
    expect: { instagram: "p3t3rango", x: "p3t3rango", youtube: "peterango" },
    forbidHosts: ["screenrant.com"],
    expectedProfiles: ["https://music.apple.com/us/artist/1513734272"],
    note: "",
};

const afterDiscovery = { handles: { instagram: "p3t3rango", x: null, youtube: null }, sourceUrls: [], links: [], loreProfiles: [] };
const afterSearch = { handles: { instagram: "p3t3rango", x: "p3t3rango", youtube: null }, sourceUrls: ["https://peterango.com/"], links: ["https://peterango.com/"], loreProfiles: [] };

describe("runResearchCase", () => {
    beforeEach(() => {
        jest.resetModules();
        for (const m of [isProductionDatabase, resetArtistForResearch, restoreArtistDsp, writeDiscoveredProfiles, readResearchOutcome, searchAndPopulateVault]) m.mockReset();
        isProductionDatabase.mockReturnValue(false);
        resetArtistForResearch.mockResolvedValue({ spotify: "sp-1", deezer: "dz-1" });
        writeDiscoveredProfiles.mockResolvedValue({ found: 1, alternatives: 0, provisionalSiteNames: ["instagram"], discoveryError: null });
        readResearchOutcome.mockResolvedValueOnce(afterDiscovery).mockResolvedValueOnce(afterSearch);
        searchAndPopulateVault.mockResolvedValue([]);
    });

    it("runs the flow an artist actually runs, in order, and puts the DSP ids back", async () => {
        const { runResearchCase } = await import("@/server/utils/evals/runResearchCase");
        const result = await runResearchCase(CASE);
        expect(resetArtistForResearch).toHaveBeenCalledWith(CASE.id, ["deezer"]);
        expect(writeDiscoveredProfiles).toHaveBeenCalledWith(CASE.id);
        expect(searchAndPopulateVault).toHaveBeenCalledWith(CASE.id, { provisionalSiteNames: ["instagram"] });
        expect(restoreArtistDsp).toHaveBeenCalledWith(CASE.id, { spotify: "sp-1", deezer: "dz-1" });
        const order = [resetArtistForResearch, writeDiscoveredProfiles, searchAndPopulateVault, restoreArtistDsp].map(m => m.mock.invocationCallOrder[0]);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(result).toEqual({
            ...afterSearch,
            // Handles discovery alone got right, so a regression is attributable to the half that caused it.
            profileLinks: 1,
            // What discovery alone stored, scored on its own so the two halves read apart.
            discoveryHandles: afterDiscovery.handles,
            alternatives: 0,
            discoveryError: null,
            vaultError: null,
            seconds: expect.any(Number),
        });
    });

    it("refuses to run against production", async () => {
        isProductionDatabase.mockReturnValue(true);
        const { runResearchCase } = await import("@/server/utils/evals/runResearchCase");
        await expect(runResearchCase(CASE)).rejects.toThrow("production");
        expect(resetArtistForResearch).not.toHaveBeenCalled();
    });

    it("records a vault search failure and still reads the outcome and restores the DSP ids", async () => {
        searchAndPopulateVault.mockRejectedValue(new Error("EMAXCONNSESSION"));
        const { runResearchCase } = await import("@/server/utils/evals/runResearchCase");
        const result = await runResearchCase(CASE);
        expect(result.vaultError).toBe("EMAXCONNSESSION");
        expect(result.handles).toEqual(afterSearch.handles);
        expect(restoreArtistDsp).toHaveBeenCalled();
    });
});
