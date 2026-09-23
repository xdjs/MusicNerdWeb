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

describe("readResearchOutcome", () => {
    beforeEach(() => { jest.resetModules(); execute.mockReset(); });

    it("reads handles, kept sources, Links and profile-typed Lore for #1273's platforms", async () => {
        execute
            .mockResolvedValueOnce([{ instagram: "p3t3rango", x: "p3t3rango", youtube: null, tiktok: null, facebook: null, soundcloud: "peterango", bandcamp: "peterango", twitch: null }])
            .mockResolvedValueOnce([
                { url: "https://peterango.com/", type: "website", title: "Pete Rango", snippet: "Producer" },
                { url: "https://music.apple.com/us/artist/pete-rango/1330310245", type: "profile" },
                { url: "https://www.instagram.com/p3t3rango/", type: "profile" },
                { url: "https://screenrant.com/rango-soundtrack/", type: "article" },
            ])
            .mockResolvedValueOnce([{ platform: "apple_music", platform_id: "1513734272" }]);
        const { readResearchOutcome } = await import("@/server/utils/evals/readResearchOutcome");
        const outcome = await readResearchOutcome(ID);
        expect(execute.mock.calls[0][0].raw).toBe(`select instagram, x, youtube, tiktok, facebook, soundcloud, bandcamp, twitch from artists where id = '${ID}'`);
        expect(execute.mock.calls[1][0]).toEqual({ template: "select url, type, title, snippet from artist_vault_sources where artist_id = ?::uuid", values: [ID] });
        expect(execute.mock.calls[2][0]).toEqual({ template: "select platform, platform_id from artist_id_mappings where artist_id = ?::uuid", values: [ID] });
        expect(outcome).toEqual({
            handles: { instagram: "p3t3rango", x: "p3t3rango", youtube: null, tiktok: null, facebook: null, soundcloud: "peterango", bandcamp: "peterango", twitch: null },
            sourceUrls: [
                "https://peterango.com/",
                "https://music.apple.com/us/artist/pete-rango/1330310245",
                "https://www.instagram.com/p3t3rango/",
                "https://screenrant.com/rango-soundtrack/",
            ],
            // Links today: website-typed sources (OfficialSiteLinks) and catalogue mappings.
            links: ["https://peterango.com/", "https://music.apple.com/us/artist/1513734272"],
            // Lore: profile-typed sources, but only the two platforms #1273 is about;
            // an Instagram profile page in Lore is a different question.
            loreProfiles: ["https://music.apple.com/us/artist/pete-rango/1330310245"],
            // What a judge reads: each kept source as the page lists it.
            sources: [
                { url: "https://peterango.com/", title: "Pete Rango", snippet: "Producer" },
                { url: "https://music.apple.com/us/artist/pete-rango/1330310245", title: null, snippet: null },
                { url: "https://www.instagram.com/p3t3rango/", title: null, snippet: null },
                { url: "https://screenrant.com/rango-soundtrack/", title: null, snippet: null },
            ],
        });
    });

    it("returns empty collections for an artist with nothing", async () => {
        execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        const { readResearchOutcome } = await import("@/server/utils/evals/readResearchOutcome");
        expect(await readResearchOutcome(ID)).toEqual({ handles: {}, sourceUrls: [], links: [], loreProfiles: [], sources: [] });
    });

    it("maps a beatport mapping to its artist URL too", async () => {
        execute.mockResolvedValueOnce([{}]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ platform: "beatport", platform_id: "12345" }, { platform: "musicbrainz", platform_id: "abc" }]);
        const { readResearchOutcome } = await import("@/server/utils/evals/readResearchOutcome");
        expect((await readResearchOutcome(ID)).links).toEqual(["https://www.beatport.com/artist/12345"]);
    });
});
