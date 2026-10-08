import type { MemoryEntry, KnowledgeResults } from "./types";
import type {
  InterviewAnchor,
  InterviewReference,
} from "./interviewPlanSchemas";
import { resolveInterviewReferences } from "./resolveInterviewReferences";
import { locateInterviewQuote } from "./locateInterviewQuote";
import { assembleInterviewHistory } from "./assembleInterviewHistory";
/** Derive exact offsets from unique quotes; the model never calculates positions or shortens source ids. */
export function resolveInterviewAnchors(
  anchors: InterviewAnchor[],
  originals: KnowledgeResults["read"][],
  memory: { entries: MemoryEntry[] },
  history: KnowledgeResults["history"][],
) {
  const references: InterviewReference[] = anchors.map((anchor) => {
    let text: string | undefined;
    if (anchor.kind === "original") {
      const matches = new Map<string, InterviewReference>();
      for (const { passage: p } of originals) {
        if (
          p.source.sourceId !== anchor.sourceId ||
          p.revision !== anchor.revision
        )
          continue;
        try {
          const found = locateInterviewQuote(p.text, anchor.quote);
          const start = p.start + found.start,
            end = p.start + found.end;
          matches.set(`${start}:${end}`, {
            kind: "original",
            sourceId: anchor.sourceId,
            revision: anchor.revision,
            start,
            end,
            quote: found.quote,
          });
        } catch (error) {
          if (
            !error ||
            typeof error !== "object" ||
            !("code" in error) ||
            error.code !== "quote_missing"
          )
            throw error;
        }
      }
      if (matches.size !== 1)
        throw new Error("Interview quote is missing or ambiguous");
      return [...matches.values()][0];
    } else {
      const latest = memory.entries
        .find(
          (e) =>
            e.kind === "latest_answer" &&
            e.entryId === anchor.entryId &&
            e.revision === anchor.revision,
        )
        ?.fields.find((f) => f.name === "answer");
      const old = (latest ? [] : assembleInterviewHistory(history))
        .find(
          (e) =>
            e.kind === "answer" &&
            e.entryId === anchor.entryId &&
            e.revision === anchor.revision,
        )
        ?.fields.find((f) => f.field === "answer");
      text = (latest ?? old)?.text ?? undefined;
    }
    if (text === undefined)
      throw new Error("Interview quote is missing or ambiguous");
    const matched = locateInterviewQuote(text, anchor.quote);
    return { ...anchor, ...matched };
  });
  return resolveInterviewReferences(references, originals, memory, history);
}
