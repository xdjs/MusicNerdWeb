/** Decode complete provider text fields without stitching fields or repairing truncated records. */
export function getStructuredQuoteTexts(original: string): string[] {
  try {
    const record: unknown = JSON.parse(original);
    if (!record || typeof record !== "object" || Array.isArray(record)) return [];
    return ["title", "description", "collection_name"].flatMap(key => {
      const value = (record as Record<string, unknown>)[key];
      return typeof value === "string" ? [value] : [];
    });
  } catch {
    return [];
  }
}
