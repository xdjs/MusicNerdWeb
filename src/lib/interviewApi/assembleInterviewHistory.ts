import { isDeepStrictEqual } from "node:util";
import type { KnowledgeResults } from "./types";

type Entry = KnowledgeResults["history"]["entries"][number];
type Field = Entry["fields"][number];

/** Reassemble complete exact older answers and their questions without trusting partial or conflicting reads. */
export function assembleInterviewHistory(pages: KnowledgeResults["history"][]) {
  const entries = new Map<
    string,
    { metadata: Omit<Entry, "fields">; fields: Map<Field["field"], Field[]> }
  >();
  for (const page of pages) {
    if (
      !isDeepStrictEqual(page.memory.latestAnswer, pages[0].memory.latestAnswer)
    )
      throw new Error("Interview history changed while reading");
    for (const { fields, ...metadata } of page.entries) {
      if (metadata.kind !== "answer") continue;
      let entry = entries.get(metadata.entryId);
      if (!entry) {
        entry = { metadata, fields: new Map() };
        entries.set(metadata.entryId, entry);
      }
      if (!isDeepStrictEqual(entry.metadata, metadata))
        throw new Error("Interview history record changed while reading");
      for (const field of fields) {
        if (
          !Number.isInteger(field.start) ||
          !Number.isInteger(field.end) ||
          !Number.isInteger(field.totalChars) ||
          field.start < 0 ||
          field.end < field.start ||
          field.end > field.totalChars ||
          field.end - field.start !== (field.text?.length ?? 0) ||
          field.complete !== (field.end === field.totalChars) ||
          (field.text === null && field.totalChars !== 0)
        )
          throw new Error("Interview history field is invalid");
        const fragments = entry.fields.get(field.field) ?? [];
        if (
          fragments.some(
            (previous) =>
              previous.totalChars !== field.totalChars ||
              (previous.text === null) !== (field.text === null),
          )
        )
          throw new Error("Interview history field changed while reading");
        fragments.push(field);
        entry.fields.set(field.field, fragments);
      }
    }
  }
  const complete: Entry[] = [];
  for (const { metadata, fields } of entries.values()) {
    const assembled: Field[] = [];
    for (const [field, fragments] of fields) {
      const ordered = [...fragments].sort(
        (a, b) => a.start - b.start || b.end - a.end,
      );
      const first = ordered[0];
      const windows: Array<{ start: number; end: number; text: string }> = [];
      for (const fragment of ordered) {
        const previous = windows.at(-1);
        const text = fragment.text ?? "";
        if (!previous || fragment.start > previous.end) {
          windows.push({ start: fragment.start, end: fragment.end, text });
          continue;
        }
        const overlap = Math.min(previous.end, fragment.end) - fragment.start;
        if (
          previous.text.slice(
            fragment.start - previous.start,
            fragment.start - previous.start + overlap,
          ) !== text.slice(0, overlap)
        )
          throw new Error("Interview history fragments conflict");
        if (fragment.end > previous.end) {
          previous.text += text.slice(overlap);
          previous.end = fragment.end;
        }
      }
      const window = windows[0];
      if (
        windows.length === 1 &&
        window.start === 0 &&
        window.end === first.totalChars
      )
        assembled.push({
          field,
          text: first.text === null ? null : window.text,
          start: 0,
          end: window.end,
          totalChars: first.totalChars,
          complete: true,
        });
    }
    const question = assembled.find((field) => field.field === "question");
    const answer = assembled.find((field) => field.field === "answer");
    if (
      metadata.answerState === "answered" &&
      question?.text !== null &&
      question?.text !== undefined &&
      answer?.text !== null &&
      answer?.text !== undefined
    )
      complete.push({ ...metadata, fields: [question, answer] });
  }
  return complete;
}
