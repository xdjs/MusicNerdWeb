/** @jest-environment node */
import { draftResearchAnswer } from "../draftResearchAnswer";
import { generateText } from "@/server/lib/ai/generateText";
import { callResearchApi } from "../callResearchApi";
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("../callResearchApi", () => ({ callResearchApi: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));
const model = jest.mocked(generateText);
const text = "The review describes driving synths. The track was mixed by Morgan.";
const reference = {
  sourceId: "vault:11111111-1111-4111-8111-111111111111", revision: "a".repeat(64),
  start: 0, end: text.length, text, url: "https://artist.example/review",
  curation: "approved" as const, evidenceKind: "original_text" as const,
  speaker: "unverified" as const, publishedAt: null, retrievedAt: null, truncated: false,
};
const sentence = (value: string, quote = "The review describes driving synths.") => ({ text: value, evidence: [{ n: 1, quote }] });
const answer = (sentences: ReturnType<typeof sentence>[]) => ({ sentences, unanswered: null });
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(callResearchApi).mockResolvedValue({ status: "ok", passage: reference, totalChars: text.length, nextStart: null });
});
it.each(["That reviewer describes driving synths.", "These picks show Morgan's mixing work."])(
  "repairs a partial verdict before displaying a dependent sentence: %s", async dependent => {
    const rejected = answer([sentence("The album won a prize."), sentence(dependent)]);
    const repaired = answer([sentence("The review describes driving synths.")]);
    model.mockResolvedValueOnce({ output: rejected } as never)
      .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [2], reason: "The prize is unsupported." } } as never)
      .mockResolvedValueOnce({ output: repaired } as never)
      .mockResolvedValueOnce({ output: { supported: true, reason: "Supported." } } as never);
    const result = await draftResearchAnswer("artist", "Artist", "What is the sound like?", [reference]);
    expect(result.answer).toBe("The review describes driving synths. [1]");
    expect(model).toHaveBeenCalledTimes(4);
    const repair = JSON.parse(model.mock.calls[2][0].prompt);
    expect(repair.repairFeedback.supportedSentenceNumbers).toEqual([2]);
    expect(repair.repairFeedback.reason).toContain("self-contained");
    expect(model.mock.calls[2][0].abortSignal).toBe(model.mock.calls[0][0].abortSignal);
  },
);
it("fails closed if a coherence repair changes the supporting quote", async () => {
  model.mockResolvedValueOnce({ output: answer([sentence("An unsupported prize."), sentence("That reviewer describes synths.")]) } as never)
    .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [2], reason: "No prize." } } as never)
    .mockResolvedValueOnce({ output: answer([sentence("The review describes synths.", "Invented supporting quote.")]) } as never);
  await expect(draftResearchAnswer("artist", "Artist", "What is the sound like?", [reference])).rejects.toThrow("Draft evidence could not be resolved");
  expect(model).toHaveBeenCalledTimes(3);
});
it("does not publish another unchecked subset when the repaired draft still fails", async () => {
  for (let i = 0; i < 2; i++) model.mockResolvedValueOnce({ output: answer([sentence("An unsupported prize."), sentence("That reviewer describes synths.")]) } as never)
    .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [2], reason: "No prize." } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "What is the sound like?", [reference])).rejects.toThrow("The sources did not support the drafted answer");
  expect(model).toHaveBeenCalledTimes(4);
});
