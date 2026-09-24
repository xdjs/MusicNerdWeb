// @ts-nocheck
import { jest } from "@jest/globals";

const execute = jest.fn();
jest.mock("@/server/db/drizzle", () => ({ db: { execute } }));
jest.mock("drizzle-orm", () => ({
    sql: Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => ({ template: strings.join("?"), values }), {
        raw: (text: string) => ({ raw: text }),
    }),
}));

const ID = "50f23458-df64-4381-8042-7333e8b64531";

describe("resetArtistForResearch", () => {
    beforeEach(() => { jest.resetModules(); execute.mockReset(); execute.mockResolvedValue([]); });

    it("clears every resettable column the seed does not name, and the vault, keeping both DSP ids", async () => {
        const { resetArtistForResearch } = await import("@/server/utils/evals/resetArtistForResearch");
        const dsp = await resetArtistForResearch(ID, ["spotify", "deezer"]);
        expect(dsp).toBeNull();
        const update = execute.mock.calls[0][0].raw;
        expect(update).toBe(`update artists set instagram = null, x = null, youtube = null, tiktok = null, facebook = null, soundcloud = null, bandcamp = null, twitch = null where id = '${ID}'`);
        expect(execute.mock.calls[1][0]).toEqual({ template: "delete from artist_vault_sources where artist_id = ?::uuid", values: [ID] });
        expect(execute).toHaveBeenCalledTimes(2);
    });

    it("snapshots the DSP ids first when a seed omits one, so the caller can put it back", async () => {
        execute.mockResolvedValueOnce([{ spotify: "sp-1", deezer: "dz-1" }]);
        const { resetArtistForResearch } = await import("@/server/utils/evals/resetArtistForResearch");
        const dsp = await resetArtistForResearch(ID, ["deezer"]);
        expect(dsp).toEqual({ spotify: "sp-1", deezer: "dz-1" });
        expect(execute.mock.calls[0][0].raw).toBe(`select spotify, deezer from artists where id = '${ID}'`);
        expect(execute.mock.calls[1][0].raw).toContain("spotify = null");
        expect(execute.mock.calls[1][0].raw).not.toContain("deezer = null");
    });

    it("reads a postgres-js row list and a { rows } result the same way", async () => {
        execute.mockResolvedValueOnce({ rows: [{ spotify: "sp-1", deezer: null }] });
        const { resetArtistForResearch } = await import("@/server/utils/evals/resetArtistForResearch");
        expect(await resetArtistForResearch(ID, [])).toEqual({ spotify: "sp-1", deezer: null });
    });
});
