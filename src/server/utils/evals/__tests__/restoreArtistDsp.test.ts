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

describe("restoreArtistDsp", () => {
    beforeEach(() => { jest.resetModules(); execute.mockReset(); execute.mockResolvedValue([]); });

    it("writes both DSP ids back, null included", async () => {
        const { restoreArtistDsp } = await import("@/server/utils/evals/restoreArtistDsp");
        await restoreArtistDsp(ID, { spotify: "sp-1", deezer: null });
        expect(execute.mock.calls[0][0]).toEqual({
            template: "update artists set spotify = ?, deezer = ? where id = ?::uuid",
            values: ["sp-1", null, ID],
        });
    });

    it("does nothing when there is no snapshot to restore", async () => {
        const { restoreArtistDsp } = await import("@/server/utils/evals/restoreArtistDsp");
        await restoreArtistDsp(ID, null);
        expect(execute).not.toHaveBeenCalled();
    });
});
