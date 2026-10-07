import type { MemoryEntry, KnowledgeResults } from "./types";
import type { InterviewReference } from "./interviewPlanSchemas";
import { assembleInterviewHistory } from "./assembleInterviewHistory";
/** Resolve every exact quote against reopened originals or complete permitted answers. */
export function resolveInterviewReferences(
  references: InterviewReference[],
  originals: KnowledgeResults["read"][],
  memory: { entries: MemoryEntry[] },
  history: KnowledgeResults["history"][],
) {
  return references.map((reference) => {
    if (reference.end - reference.start !== reference.quote.length)
      throw new Error("Interview evidence offsets do not match");
    if (reference.kind === "original") {
      const read = originals.find(
        (r) =>
          r.passage.source.sourceId === reference.sourceId &&
          r.passage.revision === reference.revision &&
          r.passage.start <= reference.start &&
          r.passage.end >= reference.end &&
          r.passage.text.slice(
            reference.start - r.passage.start,
            reference.end - r.passage.start,
          ) === reference.quote,
      );
      if (!read)
        throw new Error(
          "Interview evidence was not read in its original context",
        );
      return {
        reference,
        context: read.passage.text,
        source: read.passage.source,
        window: {
          start: read.passage.start,
          end: read.passage.end,
          totalChars: read.totalChars,
        },
        version: read.version ?? null,
      };
    }
    const latest = memory.entries.find(
      (e) =>
        e.kind === "latest_answer" &&
        e.entryId === reference.entryId &&
        e.revision === reference.revision,
    );
    const old = (latest ? [] : assembleInterviewHistory(history)).find(
      (e) =>
        e.kind === "answer" &&
        e.entryId === reference.entryId &&
        e.revision === reference.revision,
    );
    const answer =
      latest?.fields.find((f) => f.name === "answer") ??
      old?.fields.find((f) => f.field === "answer");
    if (
      !answer?.complete ||
      answer.start !== 0 ||
      answer.text === null ||
      answer.text === undefined ||
      answer.text.slice(reference.start, reference.end) !== reference.quote
    )
      throw new Error("Interview answer evidence is missing or incomplete");
    return {
      reference,
      context: answer.text,
      question:
        latest?.fields.find((f) => f.name === "question")?.text ??
        old?.fields.find((f) => f.field === "question")?.text ??
        null,
      source: null,
      window: { start: 0, end: answer.end, totalChars: answer.totalChars },
      version: null,
    };
  });
}
