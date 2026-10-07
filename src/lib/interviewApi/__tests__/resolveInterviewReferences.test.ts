/** @jest-environment node */
import { resolveInterviewReferences } from "../resolveInterviewReferences";
const revision = "a".repeat(64),
  sourceId = "vault:11111111-1111-4111-8111-111111111111";
const text = "They thanked me, but did not use my drums.";
const original = {
  passage: {
    source: { sourceId, revision },
    revision,
    start: 0,
    end: text.length,
    text,
  },
  totalChars: text.length,
  nextStart: null,
};
const ref = {
  kind: "original" as const,
  sourceId,
  revision,
  start: 0,
  end: 15,
  quote: "They thanked me",
};
const memory = { entries: [] };
it("retains complete context including the qualification beyond the selected quote", () => {
  const result = resolveInterviewReferences(
    [ref],
    [original] as never,
    memory as never,
    [],
  );
  expect(result[0]).toMatchObject({ reference: ref, context: text });
});
it("requires exact opened originals, matching revisions and offsets", () => {
  expect(() =>
    resolveInterviewReferences([ref], [], memory as never, []),
  ).toThrow();
  expect(() =>
    resolveInterviewReferences(
      [{ ...ref, revision: "b".repeat(64) }],
      [original] as never,
      memory as never,
      [],
    ),
  ).toThrow();
  expect(() =>
    resolveInterviewReferences(
      [{ ...ref, start: 1 }],
      [original] as never,
      memory as never,
      [],
    ),
  ).toThrow();
});
it("resolves the exact latest answer but refuses an incomplete old answer", () => {
  const quote = "I did not intend that.";
  const answerRef = {
    kind: "answer" as const,
    entryId: "answer:1",
    revision,
    start: 0,
    end: quote.length,
    quote,
  };
  const entry = {
    entryId: "answer:1",
    revision,
    kind: "latest_answer",
    fields: [
      {
        name: "answer",
        text: quote,
        start: 0,
        end: quote.length,
        totalChars: quote.length,
        complete: true,
      },
    ],
  };
  expect(
    resolveInterviewReferences(
      [answerRef],
      [],
      { entries: [entry] } as never,
      [],
    )[0].context,
  ).toBe(quote);
  expect(() =>
    resolveInterviewReferences(
      [answerRef],
      [],
      memory as never,
      [
        {
          entries: [
            {
              ...entry,
              kind: "answer",
              fields: [
                {
                  field: "answer",
                  text: quote,
                  start: 0,
                  end: quote.length,
                  totalChars: 100,
                  complete: false,
                },
              ],
            },
          ],
        },
      ] as never,
    ),
  ).toThrow();
});
