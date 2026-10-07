/** @jest-environment node */
import { resolveInterviewAnchors } from "../resolveInterviewAnchors";
const revision = "a".repeat(64),
  sourceId = "vault:11111111-1111-4111-8111-111111111111";
const text = "Context 🥁. I played the drums, but the take was unused.";
const read = {
  passage: {
    source: { sourceId, revision },
    revision,
    start: 100,
    end: 100 + text.length,
    text,
  },
  totalChars: 400,
  nextStart: 100 + text.length,
};
it("computes UTF-16 offsets from exact unique words while preserving full source identity", () => {
  const quote = "I played the drums";
  const result = resolveInterviewAnchors(
    [{ kind: "original", sourceId, revision, quote }],
    [read] as never,
    { entries: [] },
    [],
  );
  expect(result[0].reference).toEqual({
    kind: "original",
    sourceId,
    revision,
    start: 100 + text.indexOf(quote),
    end: 100 + text.indexOf(quote) + quote.length,
    quote,
  });
  expect(result[0].context).toContain("take was unused");
});
it("rejects invented or ambiguous quotes instead of fabricating positions", () => {
  for (const quote of ["invented words", "drums"]) {
    const repeated = {
      ...read,
      passage: { ...read.passage, text: "drums and drums", end: 115 },
    };
    expect(() =>
      resolveInterviewAnchors(
        [{ kind: "original", sourceId, revision, quote }],
        [repeated] as never,
        { entries: [] },
        [],
      ),
    ).toThrow();
  }
});
it("does not make the model calculate a window position and rejects two different original positions", () => {
  const anchor = {
    kind: "original" as const,
    sourceId,
    revision,
    quote: "I played the drums",
  };
  expect(
    resolveInterviewAnchors(
      [anchor],
      [read, read] as never,
      { entries: [] },
      [],
    )[0].reference.start,
  ).toBe(100 + text.indexOf(anchor.quote));
  const elsewhere = {
    ...read,
    passage: { ...read.passage, start: 200, end: 200 + text.length },
  };
  expect(() =>
    resolveInterviewAnchors(
      [anchor],
      [read, elsewhere] as never,
      { entries: [] },
      [],
    ),
  ).toThrow(/ambiguous/);
});

it("resolves an older answer after every continuation is read, retaining its question", () => {
  const question = "Which instrument changed the arrangement?";
  const answer = "The 🥁 drums changed it, but I kept the bass unchanged.";
  const quote = "drums changed it, but I kept the bass unchanged";
  const entry = {
    entryId: "answer:older",
    revision,
    kind: "answer",
    answerState: "answered",
  };
  const part = (
    field: string,
    text: string,
    start: number,
    totalChars: number,
  ) => ({
    field,
    text,
    start,
    end: start + text.length,
    totalChars,
    complete: start + text.length === totalChars,
  });
  const page = (fields: unknown[]) => ({
    entries: [{ ...entry, fields }],
    memory: { latestAnswer: null },
  });
  const history = [
    page([part("question", question, 0, question.length)]),
    page([part("answer", answer.slice(0, 20), 0, answer.length)]),
    page([part("answer", answer.slice(20), 20, answer.length)]),
  ];
  const result = resolveInterviewAnchors(
    [{ kind: "answer", entryId: entry.entryId, revision, quote }],
    [],
    { entries: [] },
    history as never,
  );
  expect(result[0]).toMatchObject({
    context: answer,
    question,
    reference: {
      entryId: entry.entryId,
      revision,
      start: answer.indexOf(quote),
      end: answer.indexOf(quote) + quote.length,
      quote,
    },
  });
});
