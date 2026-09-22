import { scoreCitations } from "@/lib/evals/scorers/scoreCitations";

// Marker rules are the Ask route's (src/app/api/askArtist/route.ts): a
// citation is a number in square brackets, "[13, 8, 86]" is three, a mixed
// group keeps its numbers, and "[2026-05-13]" is a date, not a citation.

describe("scoreCitations", () => {
    it("scores 1 when every cited number is a source the answer was given", () => {
        const result = scoreCitations("He grew up in Baltimore [1] and started on drums [3].", [1, 2, 3]);
        expect(result).toEqual({ name: "citations", score: 1, metadata: { cited: [1, 3], dangling: [] } });
    });

    it("scores the fraction of citations that resolve, naming the dangling ones", () => {
        const result = scoreCitations("A [1]. B [7].", [1, 2]);
        expect(result.score).toBe(0.5);
        expect(result.metadata.dangling).toEqual([7]);
    });

    it("reads grouped and mixed markers the way the route does", () => {
        const result = scoreCitations("Both records [1, 2] were self-released [19, 21, Artist Doc].", [1, 2, 19, 21]);
        expect(result.score).toBe(1);
        expect(result.metadata.cited).toEqual([1, 2, 19, 21]);
    });

    it("ignores a bracketed date", () => {
        const result = scoreCitations("Released on [2026-05-13] per his post [2].", [2]);
        expect(result.metadata.cited).toEqual([2]);
        expect(result.score).toBe(1);
    });

    it("scores 0 when an answer from sources cites nothing", () => {
        const result = scoreCitations("He is from Baltimore.", [1, 2]);
        expect(result.score).toBe(0);
        expect(result.metadata).toEqual({ cited: [], dangling: [] });
    });
});
