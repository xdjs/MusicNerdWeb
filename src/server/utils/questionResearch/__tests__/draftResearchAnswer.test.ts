/** @jest-environment node */
import { draftResearchAnswer } from "../draftResearchAnswer";
import { generateText } from "@/server/lib/ai/generateText";
import { callResearchApi } from "../callResearchApi";
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("../callResearchApi", () => ({ callResearchApi: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));
const model = jest.mocked(generateText),
  api = jest.mocked(callResearchApi);
const reference = {
  sourceId: "vault:11111111-1111-4111-8111-111111111111",
  revision: "a".repeat(64),
  start: 0,
  end: "I played drums. I did not produce it.".length,
  text: "I played drums. I did not produce it.",
  url: "https://artist.example/credits",
  curation: "pending" as const,
  evidenceKind: "original_text" as const,
  speaker: "unverified" as const,
  publishedAt: null,
  retrievedAt: null,
  truncated: false,
};
const draft = {
  sentences: [
    {
      text: "They played drums.",
      evidence: [{ n: 1, quote: "I played drums." }],
    },
  ],
  unanswered: null,
};
beforeEach(() => {
  jest.resetAllMocks();
  api.mockResolvedValue({
    status: "ok",
    passage: reference,
    totalChars: reference.text.length,
    nextStart: null,
  });
  model
    .mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({
      output: { supported: true, reason: "Drums only." },
    } as never);
});
it("reopens the original before drafting and retains exact stable references with pending curation", async () => {
  const result = await draftResearchAnswer(
    "artist",
    "Artist",
    "What did they play?",
    [reference],
  );
  expect(api).toHaveBeenCalledWith(
    expect.stringContaining("evidence/vault%3A"),
    expect.anything(),
  );
  expect(model.mock.calls[0][0].prompt).toContain("I did not produce it.");
  expect(result.answer).toBe("They played drums. [1]");
  expect(result.sources[0]).toMatchObject({
    sourceId: reference.sourceId,
    revision: reference.revision,
    curation: "pending",
  });
});
it("withholds unknown or fabricated quote references before checking a claim", async () => {
  model.mockReset();
  model.mockResolvedValue({
    output: {
      sentences: [
        {
          text: "They produced it.",
          evidence: [{ n: 1, quote: "I produced it." }],
        },
      ],
      unanswered: null,
    },
  } as never);
  await expect(
    draftResearchAnswer("artist", "Artist", "Who produced it?", [reference]),
  ).rejects.toThrow(/evidence/i);
  expect(model).toHaveBeenCalledTimes(1);
});
it("withholds a claim when the checker finds an omitted qualification", async () => {
  model.mockReset();
  model
    .mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({
      output: { supported: false, reason: "Qualification omitted" },
    } as never);
  await expect(
    draftResearchAnswer("artist", "Artist", "Who produced it?", [reference]),
  ).rejects.toThrow(/support/i);
});
it("does not draft after an original revision becomes unavailable", async () => {
  api.mockRejectedValue(new Error("revision changed"));
  await expect(
    draftResearchAnswer("artist", "Artist", "Who produced it?", [reference]),
  ).rejects.toThrow();
  expect(model).not.toHaveBeenCalled();
});

it("rejects inconsistent offsets rather than exposing a broken citation", async () => {
  api.mockResolvedValue({
    status: "ok",
    passage: { ...reference, end: 900 },
    totalChars: 900,
    nextStart: null,
  });
  await expect(
    draftResearchAnswer("artist", "Artist", "What did they play?", [reference]),
  ).rejects.toThrow(/evidence/i);
  expect(model).not.toHaveBeenCalled();
});
