/** Gateway model id (`provider/model`). The only place a model is named; see docs/llm.md.
 *  Every site uses Flash: the About used Pro until 2026-09-21, when the gateway refused it on the
 *  free tier and Sweetman moved it to Flash (#1259). */
export const MODEL_FLASH = "google/gemini-2.5-flash";

/** The research suite's source-relevance judge (docs/evals.md). Stronger than the Flash
 *  relevance filter it grades, so it does not share that filter's blind spots. Evals only. */
export const MODEL_JUDGE = "google/gemini-2.5-pro";
