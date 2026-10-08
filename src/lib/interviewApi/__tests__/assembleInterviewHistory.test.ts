/** @jest-environment node */
import { assembleInterviewHistory } from "../assembleInterviewHistory";
import type { KnowledgeResults } from "../types";

type Entry = KnowledgeResults["history"]["entries"][number];
const revision = "a".repeat(64);
const question = "What changed in the arrangement?";
const answer = "The 🥁 drums changed, but the bass stayed the same.";
const entry: Omit<Entry, "fields"> = {
  entryId: "answer:older",
  revision,
  kind: "answer",
  answerState: "answered",
  questionKey: "question-older",
  sitting: 1,
  offeredAt: "2026-10-01T00:00:00.000Z",
  answerUpdatedAt: "2026-10-01T00:01:00.000Z",
  source: "interview",
  correctionKind: null,
};
function part(field: "question" | "answer", start: number, end: number) {
  const text = field === "question" ? question : answer;
  return {
    field,
    text: text.slice(start, end),
    start,
    end,
    totalChars: text.length,
    complete: end === text.length,
  };
}
function page(fields: Entry["fields"]): KnowledgeResults["history"] {
  return {
    status: "ok",
    entries: [{ ...entry, fields }],
    budget: {
      returnedChars: fields.reduce((n, f) => n + (f.text?.length ?? 0), 0),
      truncated: false,
      nextCursor: null,
    },
    constraintsComplete: false,
    memory: { boundaryState: "not_implemented", latestAnswer: null },
    correctionsComplete: true,
  };
}
const full = () =>
  page([
    part("question", 0, question.length),
    part("answer", 0, answer.length),
  ]);

it("assembles exact question and answer fields across out-of-order continuations", () => {
  const result = assembleInterviewHistory([
    page([part("answer", 17, answer.length)]),
    page([part("question", 0, question.length), part("answer", 0, 17)]),
  ]);
  expect(result).toEqual(full().entries);
});

it("accepts identical overlapping reads and a complete reread after partial results", () => {
  const partial = page([
    part("question", 0, question.length),
    part("answer", 0, 17),
  ]);
  expect(
    assembleInterviewHistory([
      partial,
      page([part("answer", 10, answer.length)]),
      partial,
      full(),
    ]),
  ).toEqual(full().entries);
});

it("keeps gaps and answers without their complete question uncitable", () => {
  expect(
    assembleInterviewHistory([
      page([part("question", 0, question.length), part("answer", 0, 10)]),
      page([part("answer", 11, answer.length)]),
    ]),
  ).toEqual([]);
  expect(
    assembleInterviewHistory([page([part("answer", 0, answer.length)])]),
  ).toEqual([]);
});

it("does not discard a complete answer because another retrieved entry is unfinished", () => {
  const partial = page([part("answer", 0, 10)]);
  partial.entries[0].entryId = "answer:unfinished";
  expect(assembleInterviewHistory([full(), partial])).toEqual(full().entries);
});

it("rejects conflicting overlapping text instead of preferring a later complete read", () => {
  const conflicting = page([
    { ...part("answer", 10, answer.length), text: "X" + answer.slice(11) },
  ]);
  expect(() => assembleInterviewHistory([full(), conflicting])).toThrow(
    /changed|conflict/,
  );
});

it("rejects changed revisions, metadata or latest-answer snapshots", () => {
  const changedRevision = full();
  changedRevision.entries[0].revision = "b".repeat(64);
  const changedMetadata = full();
  changedMetadata.entries[0].sitting = 2;
  const changedSnapshot = full();
  changedSnapshot.memory.latestAnswer = { entryId: "answer:newest", revision };
  for (const changed of [changedRevision, changedMetadata, changedSnapshot]) {
    expect(() => assembleInterviewHistory([full(), changed])).toThrow(
      /changed/,
    );
  }
});

it("rejects inconsistent offsets, lengths and completeness markers", () => {
  for (const change of [
    { start: 1 },
    { end: answer.length - 1 },
    { totalChars: answer.length + 1 },
    { complete: false },
    { text: null },
  ]) {
    const invalid = full();
    Object.assign(invalid.entries[0].fields[1], change);
    expect(() => assembleInterviewHistory([invalid])).toThrow(/invalid/);
  }
});

it("does not produce answer evidence from skipped questions or corrections", () => {
  const skipped = full();
  skipped.entries[0].answerState = "skipped";
  skipped.entries[0].fields[1] = {
    field: "answer",
    text: null,
    start: 0,
    end: 0,
    totalChars: 0,
    complete: true,
  };
  const correction = full();
  correction.entries[0].kind = "correction";
  expect(assembleInterviewHistory([skipped, correction])).toEqual([]);
});
