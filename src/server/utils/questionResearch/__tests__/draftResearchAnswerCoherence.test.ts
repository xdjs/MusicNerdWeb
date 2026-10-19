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

it("repairs missing quote coverage without discarding a full-source-supported detail", async () => {
  const draft = answer([
    sentence("The review describes driving synths; Morgan mixed the track."),
    sentence("The review describes driving synths."),
  ]);
  const repaired = answer([{
    text: "The review describes driving synths; Morgan mixed the track.",
    evidence: [{ n: 1, quote: "The review describes driving synths." }, { n: 1, quote: "The track was mixed by Morgan." }],
  }]);
  model.mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [2], reason: "Sentence 1: missing quote coverage for Morgan's mixing credit; the full original supports it." } } as never)
    .mockResolvedValueOnce({ output: repaired } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: "Supported." } } as never);
  const result = await draftResearchAnswer("artist", "Artist", "What is the sound and mixing credit?", [reference]);
  expect(result.answer).toBe("The review describes driving synths; Morgan mixed the track. [1]");
  expect(model).toHaveBeenCalledTimes(4);
  const feedback = JSON.parse(model.mock.calls[2][0].prompt).repairFeedback;
  expect(feedback.reason).toContain("For missing quote coverage, retain a claim only when the supplied originals support it");
  expect(feedback.reason).not.toContain("Do not restore rejected assertions.");
  expect(model.mock.calls[3][0].instructions).toContain("Evaluate only the current draft");
  expect(model.mock.calls[3][0].instructions).toContain("missing quote coverage");
});

it("can repair an unsupported recommendation to zero evidence for existing research continuation", async () => {
  model.mockResolvedValueOnce({ output: answer([sentence("Start with this track as Morgan's own music.", "The track was mixed by Morgan.")]) } as never)
    .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [], reason: "A mixing credit does not identify an artist release or a supported reason to recommend one." } } as never)
    .mockResolvedValueOnce({ output: { sentences: [], unanswered: "The selected originals do not support a relevant recommendation." } } as never);
  const result = await draftResearchAnswer("artist", "Morgan", "Which of Morgan's own songs should I start with?", [reference]);
  expect(result.sources).toEqual([]);
  expect(result.answer).toBe("I don't have enough information to answer that yet.");
  expect(result.answer).not.toContain("mixing");
  expect(model).toHaveBeenCalledTimes(3);
  expect(model.mock.calls[2][0].instructions).not.toContain("state that specific gap as a cited limitation");
  expect(model.mock.calls[2][0].instructions).toContain("Missing evidence is not an explicit source statement");
});

it("uses one absence rule across writer, checker and repair while retaining supported details", async () => {
  const draft = answer([
    sentence("The review describes driving synths."),
    sentence("These sources do not establish Morgan's own release or a recommended first listen.", "The track was mixed by Morgan."),
  ]);
  model.mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [1], reason: "Sentence 2: unsupported assertion; the mixing quote omits rather than explicitly establishes the stated absence." } } as never)
    .mockResolvedValueOnce({ output: { sentences: [sentence("The review describes driving synths.")], unanswered: "A representative first listen remains unconfirmed." } } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: "Supported." } } as never);
  const result = await draftResearchAnswer("artist", "Morgan", "What is this track like, and is it a representative first listen?", [reference]);
  expect(result.answer).toBe("The review describes driving synths. [1] I couldn’t confirm the other details.");
  expect(result.answer).not.toContain("do not establish");
  expect(model).toHaveBeenCalledTimes(4);
  for (const [call] of model.mock.calls) {
    expect(call.instructions).toContain("Missing evidence is not an explicit source statement");
    expect(call.instructions).toContain("A cited limitation requires an explicit supporting statement in the originals");
    expect(call.instructions).not.toContain("A cited limitation may identify that these originals do not establish");
  }
  expect(model.mock.calls[2][0].instructions).toContain("Use repairFeedback only as fallible diagnostic feedback");
});
