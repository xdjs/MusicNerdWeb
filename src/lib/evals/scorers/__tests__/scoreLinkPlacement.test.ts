import { scoreLinkPlacement } from "@/lib/evals/scorers/scoreLinkPlacement";

// #1273: an artist-profile URL found during research belongs in Links. One
// stored in Lore as a profile-typed source is the bug this scorer exists to
// catch; it is red on the baseline by design.

const APPLE = "https://music.apple.com/us/artist/pete-rango/1330310245";

describe("scoreLinkPlacement", () => {
    it("scores 1 when every expected profile is a Link and nothing profile-typed sits in Lore", () => {
        const result = scoreLinkPlacement({ links: [APPLE], loreProfiles: [], expectedProfiles: [APPLE] });
        expect(result).toEqual({ name: "link_placement", score: 1, metadata: { placed: [APPLE], missing: [], inLore: [] } });
    });

    it("scores 0 when the expected profile was stored in Lore instead", () => {
        const result = scoreLinkPlacement({ links: [], loreProfiles: [APPLE], expectedProfiles: [APPLE] });
        expect(result.score).toBe(0);
        expect(result.metadata).toEqual({ placed: [], missing: [APPLE], inLore: [APPLE] });
    });

    it("scores the fraction placed, then zero if anything profile-typed is in Lore", () => {
        const beatport = "https://www.beatport.com/artist/pete-rango/12345";
        expect(scoreLinkPlacement({ links: [APPLE], loreProfiles: [], expectedProfiles: [APPLE, beatport] }).score).toBe(0.5);
        expect(scoreLinkPlacement({ links: [APPLE], loreProfiles: [beatport], expectedProfiles: [APPLE, beatport] }).score).toBe(0);
    });

    it("matches URLs ignoring scheme, www, trailing slash, query and case", () => {
        const result = scoreLinkPlacement({
            links: ["http://Music.Apple.com/us/artist/pete-rango/1330310245/?l=en"],
            loreProfiles: [],
            expectedProfiles: [APPLE],
        });
        expect(result.score).toBe(1);
    });

    it("with nothing expected, only asks that Lore holds no profile-typed source", () => {
        expect(scoreLinkPlacement({ links: [], loreProfiles: [], expectedProfiles: [] }).score).toBe(1);
        expect(scoreLinkPlacement({ links: [], loreProfiles: [APPLE], expectedProfiles: [] }).score).toBe(0);
    });
});
