/** Exported so callers (e.g. the publish-turn retry budget) can reason about
 *  worst-case Gemini call duration without re-declaring the constant.
 *  Measured p95 with thinking off is ~6.5s (n=8, artist 50f23458-...) — 15s
 *  is ~2.3x headroom. See the knowledge-doc report for the full before/after
 *  measurement; the ORIGINAL 20s budget was sized for a call that no longer
 *  runs anywhere near that long, now that thinking is off (see
 *  synthesizeArtistDoc) — the timeout didn't need raising, it needed
 *  tightening once the real cost (default thinking) was found and cut. */
export const GEMINI_TIMEOUT_MS = 15_000;
/** About is a much lighter call (a plain paragraph from an already-built
 *  doc) — measured p95 ~2.9s, so it gets its own tighter bound rather than
 *  inheriting the doc's. This matters for the retry-budget math in
 *  turnHandlers: a tighter per-call bound means an About failure is
 *  detected (and becomes retry/fallback-eligible) well before it alone
 *  could burn the whole publish-turn deadline. */
export const GEMINI_ABOUT_TIMEOUT_MS = 12_000;
/** Bound for `synthesizeFallbackAbout` — a lighter prompt than either call
 *  above (no worked example, no citation manifest), so the same generous
 *  ~4x-headroom-over-About logic applies. */
export const FALLBACK_TIMEOUT_MS = 12_000;
