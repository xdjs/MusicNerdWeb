import type { Score } from "@/lib/evals/Score";
import type { SourceVerdict } from "@/lib/evals/scorers/scoreSourceRelevance";

type SourceCoverageMetadata = { coverage: number; listing: number; own: number; coverageUrls: string[] };

/**
 * Of the sources the judge accepted as about the artist, the share that is coverage
 * (an interview, review, article, feature or podcast) rather than a listing or the
 * artist's own page. `source_relevance` says the sources are the right artist; this says
 * whether they are worth reading, since a catalogue page adds nothing to Lore or the
 * knowledge document. Rejected sources are ignored. Nothing accepted scores 0.
 */
export function scoreSourceCoverage(verdicts: SourceVerdict[]): Score<SourceCoverageMetadata> {
    const accepted = verdicts.filter(v => v.aboutArtist);
    const coverage = accepted.filter(v => v.kind === "coverage");
    return {
        name: "source_coverage",
        score: accepted.length === 0 ? 0 : coverage.length / accepted.length,
        metadata: {
            coverage: coverage.length,
            listing: accepted.filter(v => v.kind === "listing").length,
            own: accepted.filter(v => v.kind === "own").length,
            coverageUrls: coverage.map(v => v.url),
        },
    };
}
