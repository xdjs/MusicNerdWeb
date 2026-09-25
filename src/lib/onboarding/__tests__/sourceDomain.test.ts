import { sourceDomain } from "@/lib/onboarding/sourceDomain";

describe("sourceDomain", () => {
    it("is the host without www", () => {
        expect(sourceDomain("https://www.richmondmagazine.com/music/bio-ritmo")).toBe("richmondmagazine.com");
        expect(sourceDomain("https://en.wikipedia.org/wiki/Bio_Ritmo")).toBe("en.wikipedia.org");
    });

    it("falls back to the text it was given when it isn't a URL", () => {
        expect(sourceDomain("not a url")).toBe("not a url");
    });
});
