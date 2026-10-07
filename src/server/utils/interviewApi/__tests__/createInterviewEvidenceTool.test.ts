/** @jest-environment node */
import { createInterviewEvidenceTool } from "../createInterviewEvidenceTool";
jest.mock("ai", () => ({ tool: (input: unknown) => input }));
const revision = "a".repeat(64),
  entryId = "answer:11111111-1111-4111-8111-111111111111";
const memory = {
  entries: [
    {
      entryId,
      revision,
      kind: "latest_answer",
      fields: [
        {
          name: "answer",
          text: "I did not intend that sound.",
          start: 0,
          end: 28,
          totalChars: 28,
          complete: true,
        },
      ],
      metadata: {},
    },
  ],
};
it("shares the bounded context budget with original-reading tools", async () => {
  const diagnostics = { returnedChars: 48000 };
  const access = createInterviewEvidenceTool({
    memory: memory as never,
    originals: [],
    history: [],
    diagnostics,
  });
  await expect(
    (
      access.tool.execute as (
        input: unknown,
        context: unknown,
      ) => Promise<unknown>
    )(
      {
        references: [
          {
            kind: "answer",
            entryId,
            revision,
            quote: "I did not intend that sound.",
          },
        ],
      },
      {},
    ),
  ).rejects.toThrow(/budget/);
  expect(access.validated.size).toBe(0);
});
it("returns repairable feedback for an invented quote and records only validated exact references", async () => {
  const access = createInterviewEvidenceTool({
    memory: memory as never,
    originals: [],
    history: [],
  });
  const execute = access.tool.execute as (
    input: unknown,
    context: unknown,
  ) => Promise<unknown>;
  const anchor = {
    kind: "answer",
    entryId,
    revision,
    quote: "I intended that sound.",
  };
  expect(await execute({ references: [anchor] }, {})).toMatchObject({
    valid: false,
  });
  expect(access.validated.size).toBe(0);
  const result = await execute(
    { references: [{ ...anchor, quote: "I did not intend that sound." }] },
    {},
  );
  expect(result).toMatchObject({
    valid: true,
    references: [
      {
        entryId,
        revision,
        start: 0,
        end: 28,
        quote: "I did not intend that sound.",
      },
    ],
  });
  expect(access.validated.size).toBe(1);
});
