import { listSummary } from "@/lib/onboarding/listSummary";

describe("listSummary", () => {
    it("names the first four and counts the rest", () => {
        expect(listSummary(["spotify", "youtube", "bandcamp", "soundcloud", "instagram", "facebook", "discogs"]))
            .toBe("spotify, youtube, bandcamp, soundcloud and 3 more");
    });

    it("names every one when there are four or fewer", () => {
        expect(listSummary(["spotify"])).toBe("spotify");
        expect(listSummary(["spotify", "youtube"])).toBe("spotify and youtube");
        expect(listSummary(["spotify", "youtube", "bandcamp", "soundcloud"])).toBe("spotify, youtube, bandcamp and soundcloud");
    });

    it("takes a different number to name", () => {
        expect(listSummary(["a.com", "b.com", "c.com", "d.com", "e.com"], 3)).toBe("a.com, b.com, c.com and 2 more");
    });

    it("is empty for nothing", () => {
        expect(listSummary([])).toBe("");
    });
});
