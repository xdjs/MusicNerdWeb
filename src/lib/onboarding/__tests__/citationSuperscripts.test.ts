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

    it("drops a marker still streaming in at the very end, so Markdown can't draw it as a half-typed link", () => {
        expect(citationSuperscripts("pioneers [1")).toBe("pioneers ");
        expect(citationSuperscripts("pioneers [")).toBe("pioneers ");
        expect(citationSuperscripts("pioneers [12] and [3")).toBe("pioneers <sup>[12]</sup> and ");
    });

    it("keeps an opening bracket that isn't at the end", () => {
        expect(citationSuperscripts("a [draft] of [1")).toBe("a [draft] of ");
    });

    it("returns text without markers unchanged", () => {
        expect(citationSuperscripts("## overview\nBio Ritmo is a salsa band.")).toBe("## overview\nBio Ritmo is a salsa band.");
    });
});
