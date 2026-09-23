import { scoreSourceCoverage } from "@/lib/evals/scorers/scoreSourceCoverage";

describe("scoreSourceCoverage", () => {
    it("scores the share of accepted sources that are coverage, counting each kind", () => {
        const result = scoreSourceCoverage([
            { url: "https://a.example/interview", aboutArtist: true, kind: "coverage", reason: "Interview" },
            { url: "https://www.allmusic.com/artist/x", aboutArtist: true, kind: "listing", reason: "Catalogue page" },
            { url: "https://peterango.com/", aboutArtist: true, kind: "own", reason: "His site" },
            { url: "https://b.example/review", aboutArtist: true, kind: "coverage", reason: "Review" },
            { url: "https://screenrant.com/rango", aboutArtist: false, kind: "coverage", reason: "The film" },
        ]);
        expect(result).toEqual({
            name: "source_coverage",
            score: 0.5,
            metadata: { coverage: 2, listing: 1, own: 1, coverageUrls: ["https://a.example/interview", "https://b.example/review"] },
        });
    });

    it("ignores rejected sources entirely: a namesake's interview is not coverage", () => {
        const result = scoreSourceCoverage([{ url: "https://x.example", aboutArtist: false, kind: "coverage", reason: "Namesake" }]);
        expect(result.metadata.coverage).toBe(0);
    });

    it("scores 0 when nothing was accepted, so an empty source search cannot look substantive", () => {
        expect(scoreSourceCoverage([]).score).toBe(0);
    });
});
