/** The Braintrust experiment name for one run: `<suite> · <model> · <short sha>`, so
 *  the experiment list reads as what was measured, on which model, from which commit
 *  (docs/evals.md). The model is the code's `MODEL_DEFAULT` at that commit: a model
 *  comparison is two branches, not a runtime switch. */
export function experimentName(suite: string, model: string, sha: string): string {
    return `${suite} · ${model} · ${sha.slice(0, 7)}`;
}
