import type { Score } from "@/lib/evals/Score";

type CitationsMetadata = { cited: number[]; dangling: number[] };

/**
 * Whether an Ask answer's citation markers point at sources it was actually given.
 * Markers are read the way the route reads them (src/app/api/askArtist/route.ts):
 * a number in square brackets, "[13, 8, 86]" is three, a mixed group such as
 * "[19, 21, Artist Doc]" keeps its numbers, and "[2026-05-13]" is a date, not a citation.
 *
 * Score is the fraction of cited numbers that are in `citable`, and 0 when an answer
 * cites nothing at all: an answer written from sources is expected to say which.
 */
export function scoreCitations(answer: string, citable: number[]): Score<CitationsMetadata> {
    const cited: number[] = [];
    for (const m of answer.matchAll(/\[([^\]]+)\]/g)) {
        const body = m[1];
        if (/\d{4}-\d{2}/.test(body)) continue;
        for (const part of body.split(",")) {
            const n = Number(part.trim());
            if (Number.isInteger(n) && n > 0 && !cited.includes(n)) cited.push(n);
        }
    }
    const known = new Set(citable);
    const dangling = cited.filter(n => !known.has(n));
    return {
        name: "citations",
        score: cited.length === 0 ? 0 : (cited.length - dangling.length) / cited.length,
        metadata: { cited, dangling },
    };
}
