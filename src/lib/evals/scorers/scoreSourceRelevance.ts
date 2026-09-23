import type { Score } from "@/lib/evals/Score";

/** What a kept page is: coverage (interview, review, article, feature, podcast), a
 *  listing (directory, catalogue, database, store or streaming page), or the artist's own. */
export type SourceKind = "coverage" | "listing" | "own";

/** One kept source as the relevance judge saw it. */
export type SourceVerdict = { url: string; aboutArtist: boolean; kind: SourceKind; reason: string };

type SourceRelevanceMetadata = { judged: number; about: number; notAbout: string[] };

/**
 * Source precision without a list: the share of kept sources the judge found to be about
 * this artist, with every rejected one named and its reason. `scoreForbiddenHosts` only
 * catches namesakes somebody already listed; this catches the ones nobody has met yet.
 * Nothing kept scores 1, since that is recall, which `scoreSourcesKept` scores.
 */
export function scoreSourceRelevance(verdicts: SourceVerdict[]): Score<SourceRelevanceMetadata> {
    const about = verdicts.filter(v => v.aboutArtist).length;
    return {
        name: "source_relevance",
        score: verdicts.length === 0 ? 1 : about / verdicts.length,
        metadata: {
            judged: verdicts.length,
            about,
            notAbout: verdicts.filter(v => !v.aboutArtist).map(v => `${v.url} — ${v.reason}`),
        },
    };
}
