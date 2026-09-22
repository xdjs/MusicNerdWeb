/** What every scorer under `src/lib/evals/scorers` returns: the shape Braintrust's
 *  `Eval()` accepts from a scorer, with the evidence for the number in `metadata`
 *  so a reviewer can see why a case scored what it did (docs/evals.md). */
export type Score<M extends Record<string, unknown> = Record<string, unknown>> = {
    name: string;
    /** 0 to 1. */
    score: number;
    metadata: M;
};
