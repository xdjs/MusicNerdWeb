import type { MemoryEntry, KnowledgeResults } from "./types";
import type {
  InterviewAnchor,
  InterviewReference,
} from "./interviewPlanSchemas";
import { resolveInterviewReferences } from "./resolveInterviewReferences";
/** Derive exact offsets from unique quotes; the model never calculates positions or shortens source ids. */
export function resolveInterviewAnchors(
  anchors: InterviewAnchor[],
  originals: KnowledgeResults["read"][],
  memory: { entries: MemoryEntry[] },
  history: KnowledgeResults["history"][],
) {
  const references: InterviewReference[] = anchors.map((anchor) => {
    let text: string | undefined,
      start = 0;
    if (anchor.kind === "original") {
      const p = originals.find(
        (r) =>
          r.passage.source.sourceId === anchor.sourceId &&
          r.passage.revision === anchor.revision &&
          r.passage.start === anchor.windowStart,
      )?.passage;
      text = p?.text;
      start = p?.start ?? 0;
    } else {
      const latest = memory.entries
        .find(
          (e) =>
            e.kind === "latest_answer" &&
            e.entryId === anchor.entryId &&
            e.revision === anchor.revision,
        )
        ?.fields.find((f) => f.name === "answer");
      const old = history
        .flatMap((h) => h.entries)
        .find(
          (e) =>
            e.kind === "answer" &&
            e.entryId === anchor.entryId &&
            e.revision === anchor.revision,
        )
        ?.fields.find((f) => f.field === "answer");
      text = (latest ?? old)?.text ?? undefined;
    }
    const offset = text?.indexOf(anchor.quote) ?? -1;
    if (
      text === undefined ||
      offset < 0 ||
      text.indexOf(anchor.quote, offset + 1) >= 0
    )
      throw new Error("Interview quote is missing or ambiguous");
    return anchor.kind === "original"
      ? {
          kind: "original",
          sourceId: anchor.sourceId,
          revision: anchor.revision,
          start: start + offset,
          end: start + offset + anchor.quote.length,
          quote: anchor.quote,
        }
      : { ...anchor, start: offset, end: offset + anchor.quote.length };
  });
  return resolveInterviewReferences(references, originals, memory, history);
}
