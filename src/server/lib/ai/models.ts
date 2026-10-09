/** Gateway model id (`provider/model`). The only place a model is named; see docs/llm.md.
 *  Existing sites use Flash. The API-backed interviewer has a separate, flagged model pair (#1443/#1259). */
export const MODEL_FLASH = "google/gemini-2.5-flash";

export const MODEL_INTERVIEW_RESEARCH = "google/gemini-3.8-flash";
export const MODEL_INTERVIEW_CHECKER = "anthropic/claude-opus-5.5";

/** Independent public Ask About evidence checker; keep interview model choices separate. */
export const MODEL_ASK_CHECKER = "anthropic/claude-opus-5.5";
