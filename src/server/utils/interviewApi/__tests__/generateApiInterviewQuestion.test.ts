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
jest.mock("ai", () => ({
  Output: { object: jest.fn() },
  tool: (input: unknown) => input,
  NoObjectGeneratedError: { isInstance: () => false },
}));
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
  timeScopeSupported: true,
  faithfulToLatestAnswer: true,
  respectsBoundaries: true,
  novelAgainstHistory: true,
  oneClearAsk: true,
  reason: "Supported, new decision.",
};
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(fetchMandatoryInterviewMemory).mockResolvedValue(memory as never);
  jest.mocked(fetchInterviewQuestionIndex).mockResolvedValue([]);
  jest.mocked(createInterviewKnowledgeTools).mockReturnValue({
    tools: {},
    originals: [],
    history: [],
    diagnostics: { calls: 0, returnedChars: 0 },
  } as never);
  jest.mocked(researchInterviewAngles).mockImplementation(async ({ tools }) => {
    await tools.checkInterviewEvidence.execute!(
      {
        references: [
          { kind: "answer", entryId: "answer:1", revision, quote: words },
        ],
      },
      { toolCallId: "proof", messages: [] } as never,
    );
    return {
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
    } as never;
  });
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
it("rejects a historical source promoted into a current premise even when its words are supported", async () => {
  jest
    .mocked(generateText)
    .mockReset()
    .mockResolvedValueOnce({
      output: {
        question:
          "You are now returning to that sound. How does it shape the music today?",
      },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: {
        ...check,
        timeScopeSupported: false,
        reason: "The old source establishes an earlier period only.",
      },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: {
        question:
          "You are now returning to that sound. How does it shape the music today?",
      },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: {
        ...check,
        timeScopeSupported: false,
        reason: "The old source establishes an earlier period only.",
      },
      usage: {},
    } as never);
  await expect(generateApiInterviewQuestion(config, 1)).rejects.toThrow(
    /check/,
  );
  expect(generateText).toHaveBeenCalledTimes(4);
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
it("revises one rejected draft using full context and checks the revision before offering it", async () => {
  jest
    .mocked(generateText)
    .mockReset()
    .mockResolvedValueOnce({
      output: {
        question:
          "How did deciding to keep that accidental sound change the mix?",
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never)
    .mockResolvedValueOnce({
      output: {
        ...check,
        supported: false,
        reason: "The answer establishes no decision to keep it.",
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never)
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never)
    .mockResolvedValueOnce({
      output: check,
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never);
  const result = await generateApiInterviewQuestion(config, 1);
  expect(result.question).toBe("What do you think led to that sound?");
  expect(jest.mocked(generateText).mock.calls[2][0].prompt).toContain(
    "The answer establishes no decision to keep it.",
  );
  expect(jest.mocked(generateText).mock.calls[2][0].prompt).toContain(words);
  expect(result.diagnostics.draftAttempts).toBe(2);
  expect(generateText).toHaveBeenCalledTimes(4);
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
      output: { ...check, novelAgainstHistory: false },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: { ...check, novelAgainstHistory: false },
      usage: {},
    } as never);
  await expect(generateApiInterviewQuestion(config, 1)).rejects.toThrow(
    /check/,
  );
  expect(generateText).toHaveBeenCalledTimes(4);
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
it("retains the draft and rejection for a trusted evaluation observer without credentials", async () => {
  jest
    .mocked(generateText)
    .mockReset()
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: {
        ...check,
        supported: false,
        reason: "The source does not establish that premise.",
      },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: { question: "What do you think led to that sound?" },
      usage: {},
    } as never)
    .mockResolvedValueOnce({
      output: {
        ...check,
        supported: false,
        reason: "The source does not establish that premise.",
      },
      usage: {},
    } as never);
  const events: Array<{ stage: string; data: unknown }> = [];
  await expect(
    generateApiInterviewQuestion(config, 1, undefined, (event) => {
      events.push(event);
    }),
  ).rejects.toThrow(/check/);
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stage: "draft",
        data: expect.objectContaining({
          question: "What do you think led to that sound?",
        }),
      }),
      expect.objectContaining({
        stage: "check",
        data: expect.objectContaining({
          verdict: expect.objectContaining({ supported: false }),
        }),
      }),
      expect.objectContaining({
        stage: "failure",
        data: expect.objectContaining({ at: "check" }),
      }),
    ]),
  );
  expect(events.filter((event) => event.stage === "draft")).toHaveLength(2);
  expect(events.filter((event) => event.stage === "check")).toHaveLength(2);
  expect(JSON.stringify(events)).not.toContain("private-token");
});
