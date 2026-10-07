/** @jest-environment node */
import { generateApiInterviewQuestion } from "../generateApiInterviewQuestion";
import { fetchMandatoryInterviewMemory } from "../fetchMandatoryInterviewMemory";
import { fetchInterviewQuestionIndex } from "../fetchInterviewQuestionIndex";
import { createInterviewKnowledgeTools } from "../createInterviewKnowledgeTools";
import { researchInterviewAngles } from "@/server/lib/ai/researchInterviewAngles";
import { generateText } from "@/server/lib/ai/generateText";
jest.mock("../fetchMandatoryInterviewMemory", () => ({
  fetchMandatoryInterviewMemory: jest.fn(),
}));
jest.mock("../fetchInterviewQuestionIndex", () => ({
  fetchInterviewQuestionIndex: jest.fn(),
}));
jest.mock("../createInterviewKnowledgeTools", () => ({
  createInterviewKnowledgeTools: jest.fn(),
}));
jest.mock("@/server/lib/ai/researchInterviewAngles", () => ({
  researchInterviewAngles: jest.fn(),
}));
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));
const config = {
  apiOrigin: "https://api.example",
  artistId: "11111111-1111-4111-8111-111111111111",
  getAccessToken: async () => "private-token",
};
const revision = "a".repeat(64),
  words = "I did not intend that sound.";
const memory = {
  snapshotId: revision,
  sitting: 1,
  constraintsComplete: true,
  latestAnswer: { entryId: "answer:1", revision },
  entries: [
    {
      entryId: "answer:1",
      revision,
      kind: "latest_answer",
      metadata: { questionKey: "q" },
      fields: [
        {
          name: "question",
          text: "Was it deliberate?",
          start: 0,
          end: 18,
          totalChars: 18,
          complete: true,
        },
        {
          name: "answer",
          text: words,
          start: 0,
          end: words.length,
          totalChars: words.length,
          complete: true,
        },
      ],
    },
    {
      entryId: "boundary:1",
      revision,
      kind: "boundary",
      metadata: { scope: "until_retracted" },
      fields: [
        { name: "wording", text: "Keep family out of this.", complete: true },
      ],
    },
  ],
  returnedChars: 100,
};
const check = {
  supported: true,
  faithfulToLatestAnswer: true,
  respectsBoundaries: true,
  repeatsPriorQuestion: false,
  oneClearAsk: true,
  reason: "Supported, new decision.",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchMandatoryInterviewMemory).mockResolvedValue(memory as never);
  jest.mocked(fetchInterviewQuestionIndex).mockResolvedValue([]);
  jest
    .mocked(createInterviewKnowledgeTools)
    .mockReturnValue({
      tools: {},
      originals: [],
      history: [],
      diagnostics: { calls: 0, returnedChars: 0 },
    } as never);
  jest
    .mocked(researchInterviewAngles)
    .mockResolvedValue({
      output: {
        angles: [
          {
            observation: "The sound was not intentional.",
            intendedUnknown: "How the sound came about.",
            rationale:
              "Responds to the actual answer without changing lack of intention into inability.",
            connection: "single_observation",
            references: [
              { kind: "answer", entryId: "answer:1", revision, quote: words },
            ],
          },
        ],
        selected: 0,
        selectionReason: "Follows the latest answer.",
      },
      totalUsage: { inputTokens: 10, outputTokens: 10 },
    } as never);
  jest
    .mocked(generateText)
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: { inputTokens: 10, outputTokens: 10 },
    } as never)
    .mockResolvedValueOnce({
      output: check,
      usage: { inputTokens: 10, outputTokens: 10 },
    } as never);
});
it("requires mandatory memory before any research or writing", async () => {
  jest
    .mocked(fetchMandatoryInterviewMemory)
    .mockRejectedValueOnce(new Error("Memory unavailable"));
  await expect(generateApiInterviewQuestion(config, 1)).rejects.toThrow(
    /Memory unavailable/,
  );
  expect(researchInterviewAngles).not.toHaveBeenCalled();
  expect(generateText).not.toHaveBeenCalled();
});
it("supplies exact memory throughout and retains stable answer references", async () => {
  const result = await generateApiInterviewQuestion(config, 1);
  expect(result.question).toBe("What do you think led to that sound?");
  expect(result.references[0]).toMatchObject({
    entryId: "answer:1",
    revision,
    start: 0,
    end: words.length,
    quote: words,
  });
  for (const call of jest.mocked(generateText).mock.calls) {
    expect(call[0].prompt).toContain(words);
    expect(call[0].prompt).toContain("Keep family out of this.");
  }
  expect(fetchMandatoryInterviewMemory).toHaveBeenCalledTimes(2);
  expect(result.editorialAccepted).toBe(false);
});
it("rejects semantic repetition even when references resolve", async () => {
  jest
    .mocked(generateText)
    .mockReset()
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: { ...check, repeatsPriorQuestion: true },
      usage: {},
    } as never);
  await expect(generateApiInterviewQuestion(config, 1)).rejects.toThrow(
    /check/,
  );
});
it("rejects a draft after memory changes during generation", async () => {
  jest
    .mocked(fetchMandatoryInterviewMemory)
    .mockResolvedValueOnce(memory as never)
    .mockResolvedValueOnce({ ...memory, snapshotId: "b".repeat(64) } as never);
  await expect(generateApiInterviewQuestion(config, 1)).rejects.toThrow(
    /changed/,
  );
});
