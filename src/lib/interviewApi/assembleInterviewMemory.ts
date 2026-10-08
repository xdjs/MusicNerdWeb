import { isDeepStrictEqual } from "node:util";
import type { MemoryEntry, MemoryPage } from "@/lib/interviewApi/types";
/** Restore every mandatory field before the host may treat memory as complete. */
export function assembleInterviewMemory(pages: MemoryPage[]) {
  const first = pages[0];
  if (!first || pages.length > 100)
    throw new Error("Mandatory memory is incomplete");
  const entries: MemoryEntry[] = [];
  const byId = new Map<string, MemoryEntry>();
  let returnedChars = 0;
  for (const [i, page] of pages.entries()) {
    if (
      page.snapshotId !== first.snapshotId ||
      page.sitting !== first.sitting ||
      page.totalEntries !== first.totalEntries ||
      !isDeepStrictEqual(page.latestAnswer, first.latestAnswer)
    )
      throw new Error("Mandatory memory changed; restart the read");
    if (i < pages.length - 1 !== (page.budget.nextCursor !== null))
      throw new Error("Mandatory memory is incomplete");
    let pageChars = 0;
    for (const part of page.entries) {
      let entry = byId.get(part.entryId);
      if (!entry) {
        entry = { ...part, fields: [] };
        entries.push(entry);
        byId.set(entry.entryId, entry);
      }
      if (
        entry.revision !== part.revision ||
        entry.kind !== part.kind ||
        !isDeepStrictEqual(entry.metadata, part.metadata)
      )
        throw new Error("Mandatory memory record changed");
      for (const f of part.fields) {
        let field = entry.fields.find((x) => x.name === f.name);
        if (!field) {
          if (f.start !== 0) throw new Error("Mandatory memory has a gap");
          field = {
            ...f,
            text: f.text === null ? null : "",
            end: 0,
            complete: false,
          };
          entry.fields.push(field);
        }
        if (
          field.complete ||
          field.end !== f.start ||
          field.totalChars !== f.totalChars ||
          f.end - f.start !== (f.text?.length ?? 0) ||
          f.end > f.totalChars ||
          f.complete !== (f.end === f.totalChars)
        )
          throw new Error("Mandatory memory has a gap or invalid field");
        field.text = f.text === null ? null : (field.text ?? "") + f.text;
        field.end = f.end;
        field.complete = f.complete;
        pageChars += f.text?.length ?? 0;
      }
    }
    if (pageChars !== page.budget.returnedChars)
      throw new Error("Mandatory memory budget is inconsistent");
    returnedChars += pageChars;
    if (returnedChars > 32000 || JSON.stringify(entries).length > 32000)
      throw new Error("Mandatory memory exceeds its context budget");
  }
  if (
    entries.length !== first.totalEntries ||
    entries.some((e) => e.fields.some((f) => !f.complete))
  )
    throw new Error("Mandatory memory is incomplete");
  for (const e of entries) {
    const expected =
      e.kind === "latest_answer"
        ? ["answer", "question"]
        : e.kind === "correction"
          ? ["claim", "correction"]
          : ["question", "wording"];
    if (!isDeepStrictEqual(e.fields.map((f) => f.name).sort(), expected))
      throw new Error("Mandatory memory fields are incomplete");
  }
  const answers = entries.filter((e) => e.kind === "latest_answer");
  if (
    first.latestAnswer
      ? answers.length !== 1 ||
        answers[0].entryId !== first.latestAnswer.entryId ||
        answers[0].revision !== first.latestAnswer.revision
      : answers.length !== 0
  )
    throw new Error("Latest exact answer is missing");
  return {
    status: "ok" as const,
    snapshotId: first.snapshotId,
    sitting: first.sitting,
    latestAnswer: first.latestAnswer,
    entries,
    constraintsComplete: true as const,
    returnedChars,
  };
}
