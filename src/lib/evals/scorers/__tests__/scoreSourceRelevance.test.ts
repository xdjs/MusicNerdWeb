import { scoreSourceRelevance } from "@/lib/evals/scorers/scoreSourceRelevance";

describe("scoreSourceRelevance", () => {
    it("scores the share of kept sources the judge found to be about the artist, naming the rest", () => {
        const result = scoreSourceRelevance([
            { url: "https://peterango.com/", aboutArtist: true, reason: "His own site" },
            { url: "https://screenrant.com/rango", aboutArtist: false, reason: "The Rango film soundtrack" },
            { url: "https://peterango.bandcamp.com/", aboutArtist: true, reason: "His Bandcamp" },
            { url: "https://www.theguardian.com/dave", aboutArtist: true, reason: "Interview" },
        ]);
        expect(result).toEqual({
            name: "source_relevance",
            score: 0.75,
            metadata: { judged: 4, about: 3, notAbout: ["https://screenrant.com/rango — The Rango film soundtrack"] },
        });
    });

    it("scores 1 when nothing was kept: recall is sources_kept's job", () => {
        expect(scoreSourceRelevance([]).score).toBe(1);
    });
});
