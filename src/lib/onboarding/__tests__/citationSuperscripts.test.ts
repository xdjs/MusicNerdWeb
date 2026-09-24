import { citationSuperscripts } from "@/lib/onboarding/citationSuperscripts";

describe("citationSuperscripts", () => {
    it("wraps each numbered citation marker in a sup element, keeping the brackets", () => {
        expect(citationSuperscripts("formed in 1991 [1][2]. pioneers[4]."))
            .toBe("formed in 1991 <sup>[1]</sup><sup>[2]</sup>. pioneers<sup>[4]</sup>.");
    });

    it("leaves Markdown links and non-numeric brackets alone", () => {
        expect(citationSuperscripts("see [3](https://example.com) and [the band] here"))
            .toBe("see [3](https://example.com) and [the band] here");
    });

    it("leaves a marker that is still streaming in (no closing bracket yet) alone", () => {
        expect(citationSuperscripts("pioneers [1")).toBe("pioneers [1");
    });

    it("returns text without markers unchanged", () => {
        expect(citationSuperscripts("## overview\nBio Ritmo is a salsa band.")).toBe("## overview\nBio Ritmo is a salsa band.");
    });
});
