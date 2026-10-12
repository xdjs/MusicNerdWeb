import { researchReadSchema } from "./schemas";
/** Read bounded display windows without changing the stored original or research budget. */
export async function readSourceDetails(
  artistId: string,
  source: { sourceId: string; revision: string; start?: number },
  signal: AbortSignal,
) {
  const structured = source.sourceId.startsWith("latest:");
  let start = structured ? 0 : (source.start ?? 0);
  let first: ReturnType<typeof researchReadSchema.parse> | undefined;
  let text = "";
  for (let page = 0; page < (structured ? 4 : 1); page++) {
    const q = new URLSearchParams({ sourceId: source.sourceId, revision: source.revision, start: String(start) });
    const response = await fetch(`/api/artist/${artistId}/questionResearch/source?${q}`, { signal, cache: "no-store" });
    if (!response.ok) throw new Error("This original changed or is no longer available. Refresh the research.");
    const result = researchReadSchema.parse(await response.json());
    const p = result.passage;
    if (p.sourceId !== source.sourceId || p.revision !== source.revision || p.start !== start ||
      p.end - p.start !== p.text.length || p.text.length > 12000 || p.end > result.totalChars ||
      (result.nextStart !== null && (result.nextStart !== p.end || p.end <= start)) ||
      (result.nextStart === null && p.end !== result.totalChars) ||
      (first && (result.totalChars !== first.totalChars || p.url !== first.passage.url ||
        p.publishedAt !== first.passage.publishedAt || p.activityDate !== first.passage.activityDate ||
        p.activityDateKind !== first.passage.activityDateKind || p.curation !== first.passage.curation ||
        p.evidenceKind !== first.passage.evidenceKind)))
      throw new Error("This original changed or is no longer available. Refresh the research.");
    first ??= result;
    text += p.text;
    if (!structured || result.nextStart === null) return { text, url: p.url };
    if (result.totalChars > 48000) break;
    start = result.nextStart;
  }
  // An incomplete provider record cannot be formatted safely; retain its source link.
  return { text: "", url: first!.passage.url };
}
