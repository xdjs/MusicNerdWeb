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
it("keeps the original citation when a model collapses whitespace in its quote", async () => {
  const text =
    "Dutchyyy has been building it out  over the past year\n\nto escape platform dependency & reach listeners.";
  const spaced = { ...reference, text, end: text.length };
  api.mockResolvedValue({
    status: "ok",
    passage: spaced,
    totalChars: text.length,
    nextStart: null,
  });
  model.mockReset();
  model
    .mockResolvedValueOnce({
      output: {
        sentences: [
          {
            text: "The vault helps him escape platform dependency.",
            evidence: [
              {
                n: 1,
                quote:
                  "building it out over the past year to escape platform dependency",
              },
            ],
          },
        ],
        unanswered: null,
      },
    } as never)
    .mockResolvedValueOnce({
      output: { supported: true, reason: "Passage establishes purpose." },
    } as never);
  const result = await draftResearchAnswer(
    "artist",
    "Dutchyyy",
    "Why the vault?",
    [spaced],
  );
  expect(result.answer).toBe("The vault helps him escape platform dependency. [1]");
  expect(result.sources[0]).toMatchObject({
    sourceId: spaced.sourceId,
    revision: spaced.revision,
    start: 0,
    end: text.length,
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
  expect(model).toHaveBeenCalledTimes(2);
});
it("withholds a claim when the checker finds an omitted qualification", async () => {
  model.mockReset();
  model
    .mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({
      output: { supported: false, reason: "Qualification omitted" },
    } as never);
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

it("records a safe failure stage without logging source text, questions or model errors", async () => {
  const warning = jest
    .spyOn(console, "warn")
    .mockImplementation(() => undefined);
  model.mockReset();
  model.mockRejectedValue(new Error("PRIVATE PROVIDER PAYLOAD"));
  await expect(
    draftResearchAnswer("artist", "Artist", "PRIVATE QUESTION", [reference]),
  ).rejects.toThrow();
  expect(warning).toHaveBeenCalledWith(
    "[questionResearch] answer verification failed",
    {
      stage: "draft",
      category: "operation_failed",
      status: null,
      finishReason: null,
    },
  );
  expect(JSON.stringify(warning.mock.calls)).not.toMatch(
    /PRIVATE|played drums/,
  );
  warning.mockRestore();
});
it("accepts a source publication date only as exact typed metadata evidence", async () => {
  const dated = { ...reference, publishedAt: "2026-10-05T19:43:02.000Z" };
  api.mockResolvedValue({ status: "ok", passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "In a post published October 5, they said they played drums.", evidence: [
    { n: 1, field: "publishedAt", quote: dated.publishedAt }, { n: 1, field: "text", quote: "I played drums." },
  ] }], unanswered: null } } as never).mockResolvedValueOnce({ output: { supported: true, reason: "Date metadata and exact drums statement." } } as never);
  expect((await draftResearchAnswer("artist", "Artist", "Latest?", [dated])).answer).toContain("published October 5");
});
it.each([
  { field: "text", quote: 'publishedAt": "2026-10-05T19:43:02.000Z' },
  { field: "publishedAt", quote: "2026-10-06T19:43:02.000Z" },
  { field: "publishedAt", quote: 'publishedAt": "2026-10-05T19:43:02.000Z' },
])("rejects fabricated or incorrectly typed date evidence %#", async (evidence) => {
  const dated = { ...reference, publishedAt: "2026-10-05T19:43:02.000Z" };
  api.mockResolvedValue({ status: "ok", passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: "Published October 5.", evidence: [{ n: 1, ...evidence }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "Latest?", [dated])).rejects.toThrow(/evidence/i);
  expect(model).toHaveBeenCalledTimes(2);
});
it("refuses an original whose publication metadata changed before drafting", async () => {
  api.mockResolvedValue({ status: "ok", passage: { ...reference, publishedAt: "2026-10-06" }, totalChars: reference.text.length, nextStart: null });
  await expect(draftResearchAnswer("artist", "Artist", "Latest?", [{ ...reference, publishedAt: "2026-10-05" }])).rejects.toThrow(/changed/i);
  expect(model).not.toHaveBeenCalled();
});
it("does not treat an unknown publication date as typed date evidence", async () => {
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: "Published October 5.", evidence: [{ n: 1, field: "publishedAt", quote: "2026-10-05" }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "Latest?", [reference])).rejects.toThrow(/evidence/i);
  expect(model).toHaveBeenCalledTimes(2);
});
it("still requires the claim checker to reject using a publication date as a release date", async () => {
  const dated = { ...reference, publishedAt: "2026-10-05" };
  api.mockResolvedValue({ status: "ok", passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "The song was released October 5.", evidence: [{ n: 1, field: "publishedAt", quote: dated.publishedAt }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: false, reason: "Publication is not release timing." } } as never);
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "The song was released October 5.", evidence: [{ n: 1, field: "publishedAt", quote: dated.publishedAt }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: false, reason: "Publication is not release timing." } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "Release date?", [dated])).rejects.toThrow(/support/i);
  expect(model.mock.calls[1][0].instructions).toContain("never an event/release date");
});
it('keeps a resolved credit follow-up scoped even when originals mention other versions', async () => {
  const text = 'The rooftop visualizer was filmed by Morgan. The earlier studio video was filmed by Casey.';
  const scoped = { ...reference, text, end: text.length };
  api.mockResolvedValue({ status: 'ok', passage: scoped, totalChars: text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: 'Morgan filmed the rooftop visualizer.', evidence: [{ n: 1, quote: 'The rooftop visualizer was filmed by Morgan.' }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: 'Exact requested visualizer credit.' } } as never);
  const result = await draftResearchAnswer('artist', 'Artist', 'Who filmed the rooftop visualizer?', [scoped]);
  expect(model.mock.calls[0][0].instructions).toContain('One sentence is enough');
  expect(model.mock.calls[0][0].instructions).toContain('Do not add credits or facts about other works, versions, editions, dates or locations');
  expect(model.mock.calls[1][0].instructions).toContain('Reject extra facts about other works or versions');
  expect(model.mock.calls[1][0].instructions).toContain('explicit comparison or necessary disambiguation');
  expect(model.mock.calls[1][0].prompt).toContain('The earlier studio video was filmed by Casey.');
  expect(result.answer).toBe('Morgan filmed the rooftop visualizer. [1]');
});
it('rejects changed catalog activity date before drafting',async()=>{
 const catalog={...reference,sourceId:`latest:spotify:${'b'.repeat(64)}`,activityDate:'2020-02',activityDateKind:'release' as const};
 api.mockResolvedValue({status:'ok',passage:{...catalog,activityDate:'2020-03'},totalChars:catalog.text.length,nextStart:null});
 await expect(draftResearchAnswer('artist','Artist','When released?',[catalog])).rejects.toThrow(/changed/);expect(model).not.toHaveBeenCalled();
});

it("bounds structured drafting and checking without hidden thinking or provider retries", async () => {
  await draftResearchAnswer("artist", "Artist", "What did they play?", [reference]);
  expect(model).toHaveBeenCalledTimes(2);
  for (const [options] of model.mock.calls) expect(options).toMatchObject({ thinkingBudget: 0, maxRetries: 0 });
});
it.each(["length", "stop", "PRIVATE PAYLOAD"])("logs only allowlisted finish reasons: %s", async finishReason => {
  const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  model.mockReset();
  model.mockRejectedValue(Object.assign(new Error("PRIVATE BODY"), { name: "AI_NoObjectGeneratedError", finishReason, text: "PRIVATE RESPONSE" }));
  await expect(draftResearchAnswer("artist", "Artist", "PRIVATE QUESTION", [reference])).rejects.toThrow();
  expect(warning).toHaveBeenCalledWith("[questionResearch] answer verification failed", expect.objectContaining({ finishReason: finishReason === "PRIVATE PAYLOAD" ? null : finishReason }));
  expect(JSON.stringify(warning.mock.calls)).not.toContain("PRIVATE");
  warning.mockRestore();
});
it.each(['moment', 'release'] as const)("accepts exact typed %s activity dates alongside content evidence", async activityDateKind => {
  const dated = { ...reference, activityDate: '2026-10-08', activityDateKind };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: 'The October 8 record says they played drums.', evidence: [
    { n: 1, field: 'activityDate', quote: dated.activityDate },
    { n: 1, field: 'text', quote: 'I played drums.' },
  ] }], unanswered: null } } as never).mockResolvedValueOnce({ output: { supported: true, reason: 'Recorded date and content.' } } as never);
  const result = await draftResearchAnswer('artist', 'Artist', 'What did they share?', [dated]);
  expect(result.sources[0].sourceId).toBe(reference.sourceId);
  expect(model.mock.calls[1][0].instructions).toContain('activityDateKind');
});
it.each([
  { field: 'activityDate', activityDateKind: 'moment', quote: '2026-10-09' },
  { field: 'publishedAt', quote: '2026-10-08' },
])('rejects a mismatched date or null publication field: %j', async evidence => {
  const dated = { ...reference, activityDate: '2026-10-08', activityDateKind: 'moment' as const };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: 'They shared this October 8.', evidence: [{ n: 1, ...evidence }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'When?', [dated])).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(2);
});

it("rejects activity date evidence when the original has no date kind", async () => {
  const dated = { ...reference, activityDate: '2026-10-08' };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: 'They shared this October 8.', evidence: [{ n: 1, field: 'activityDate', quote: dated.activityDate }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'When?', [dated])).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(2);
});
it("lets the semantic checker reject a release date misrepresented as a post date", async () => {
  const dated = { ...reference, activityDate: '2026-10-08', activityDateKind: 'release' as const };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: 'They posted this October 8.', evidence: [{ n: 1, field: 'activityDate', quote: dated.activityDate }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: false, reason: 'Release date does not establish post date.' } } as never);
  model.mockResolvedValueOnce({ output: { sentences: [{ text: 'They posted this October 8.', evidence: [{ n: 1, field: 'activityDate', quote: dated.activityDate }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: false, reason: 'Release date does not establish post date.' } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'When?', [dated])).rejects.toThrow(/support/);
  expect(JSON.parse(model.mock.calls[1][0].prompt).input.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
it("repairs rejected latest wording once using unchanged originals and rechecks the result", async () => {
  const wrong = { ...draft, sentences: [{ ...draft.sentences[0], text: "Their latest post says they played drums." }] };
  model.mockReset();
  model.mockResolvedValueOnce({ output: wrong } as never)
    .mockResolvedValueOnce({ output: { supported: false, reason: "Unqualified latest claim. Use attribution without exhaustive recency." } } as never)
    .mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: "Supported." } } as never);
  const result = await draftResearchAnswer('artist', 'Artist', 'What is latest?', [reference]);
  expect(result.answer).toBe('They played drums. [1]');
  expect(model).toHaveBeenCalledTimes(4);
  expect(api).toHaveBeenCalledTimes(1);
  expect(JSON.parse(model.mock.calls[2][0].prompt).repairFeedback).toMatchObject({ reason: expect.stringContaining('Unqualified latest') });
  expect(model.mock.calls[2][0].abortSignal).toBe(model.mock.calls[0][0].abortSignal);
});
it("repairs a bad exact quote once before checking the new claim", async () => {
  model.mockReset();
  model.mockResolvedValueOnce({ output: { ...draft, sentences: [{ text: 'They played drums.', evidence: [{ n: 1, quote: 'They played percussion.' }] }] } } as never)
    .mockResolvedValueOnce({ output: draft } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: 'Supported.' } } as never);
  expect((await draftResearchAnswer('artist', 'Artist', 'What did they play?', [reference])).answer).toBe('They played drums. [1]');
  expect(model).toHaveBeenCalledTimes(3);
  expect(api).toHaveBeenCalledTimes(1);
});
it("does not automatically repair a model service failure", async () => {
  model.mockReset(); model.mockRejectedValue(new Error('Provider unavailable'));
  await expect(draftResearchAnswer('artist', 'Artist', 'What?', [reference])).rejects.toThrow('Provider unavailable');
  expect(model).toHaveBeenCalledTimes(1);
});
it("rejects an unsupported second draft without a third repair", async () => {
  model.mockReset();
  for (let i = 0; i < 2; i++) model.mockResolvedValueOnce({ output: draft } as never).mockResolvedValueOnce({ output: { supported: false, reason: 'Unsupported visual claim.' } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'What?', [reference])).rejects.toThrow(/support/);
  expect(model).toHaveBeenCalledTimes(4);
});
