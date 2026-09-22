/** Gateway model ids (`provider/model`). The only place a model is named; see docs/llm.md.
 *
 *  `MODEL_DEFAULT` is what every site uses unless it asks for Google Search grounding,
 *  which only Gemini provides, so grounded calls use `MODEL_GROUNDED`. */
export const MODEL_DEFAULT = "deepseek/deepseek-v4.1-flash";
export const MODEL_GROUNDED = "google/gemini-2.5-flash";
