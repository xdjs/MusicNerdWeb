const MAX_TRANSCRIPT_CHARS = 12000;

/** Reads only our provenance-marked transcript, never an arbitrary scraper transcript field. */
export function storedReelTranscript(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const saved = (raw as Record<string, unknown>)._musicnerdTranscript;
  if (!saved || typeof saved !== "object") return null;
  const value = saved as Record<string, unknown>;
  return value.version === 1 &&
    value.actor === "apify/instagram-reel-scraper" &&
    typeof value.text === "string" &&
    value.text.trim()
    ? value.text.slice(0, MAX_TRANSCRIPT_CHARS)
    : null;
}
