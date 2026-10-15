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
  expect(model.mock.calls[0][0]).toMatchObject({ model: "google/gemini-3.8-flash", thinkingLevel: "low", maxRetries: 0 });
  expect(model.mock.calls[0][0]).not.toHaveProperty("thinkingBudget");
  expect(model.mock.calls[1][0]).toMatchObject({ model: 'anthropic/claude-sonnet-5.5', maxRetries: 0, maxOutputTokens: 1500 });
  expect(model.mock.calls[1][0]).not.toHaveProperty('thinkingBudget');
  expect(model.mock.calls[1][0]).not.toHaveProperty('temperature');
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
  await expect(draftResearchAnswer('artist', 'Artist', 'What?', [reference])).rejects.toMatchObject({verificationCode: 'claim_rejected', verificationStage: 'claim_check'});
  expect(model).toHaveBeenCalledTimes(4);
});
it("renders a fixed scoped limitation instead of model-written unanswered prose", async () => {
  model.mockReset();
  model.mockResolvedValueOnce({ output: { ...draft, unanswered: 'There are no records anywhere about the release.' } } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: 'Mock checker approval cannot authorize arbitrary limitation prose.' } } as never);
  const result = await draftResearchAnswer('artist', 'Artist', 'What did they play and when?', [reference]);
  expect(result.answer).toBe('They played drums. [1] I couldn’t confirm the other details.');
  expect(result.sources[0].sourceId).toBe(reference.sourceId);
  expect(result.answer).not.toContain('anywhere');
});
it.each(['2025', '2025-08'])("accepts an exact partial activity date without inventing precision: %s", async activityDate => {
  const dated = { ...reference, activityDate, activityDateKind: 'release' as const };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: `The catalog release date is ${activityDate}.`, evidence: [{ n: 1, field: 'activityDate', quote: activityDate }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: true, reason: 'Exact catalog date precision.' } } as never);
  expect((await draftResearchAnswer('artist', 'Artist', 'When?', [dated])).answer).toContain(activityDate);
});
it("rejects invented day precision for a year-only activity date", async () => {
  const dated = { ...reference, activityDate: '2025', activityDateKind: 'release' as const };
  api.mockResolvedValue({ status: 'ok', passage: dated, totalChars: dated.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: 'Released January 1, 2025.', evidence: [{ n: 1, field: 'activityDate', quote: '2025-01-01' }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'When?', [dated])).rejects.toThrow(/evidence/);
  expect(model).toHaveBeenCalledTimes(2);
});
it("preserves the eight-character minimum for text evidence", async () => {
  model.mockReset();
  model.mockResolvedValue({ output: { sentences: [{ text: 'They played drums.', evidence: [{ n: 1, field: 'text', quote: 'played' }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer('artist', 'Artist', 'What?', [reference])).rejects.toThrow(/evidence/);
  expect(model).toHaveBeenCalledTimes(2);
});

it("keeps independently verified sentences when the bounded repair still has an unsupported extra", async () => {
  const mixed = { sentences: [...draft.sentences, { text: "They produced it.", evidence: [{ n: 1, quote: "I played drums." }] }], unanswered: null };
  model.mockReset();
  for (let i = 0; i < 2; i++) model.mockResolvedValueOnce({ output: mixed } as never).mockResolvedValueOnce({ output: { supported: false, reason: "Only drums are supported and independently answer the question.", supportedSentenceNumbers: [1] } } as never);
  const result = await draftResearchAnswer("artist", "Artist", "What did they do?", [reference]);
  expect(result.answer).toBe("They played drums. [1]");
  expect(model).toHaveBeenCalledTimes(4);
});

it("does not accept out-of-range partial-verification sentence numbers", async () => {
  model.mockReset();
  for (let i = 0; i < 2; i++) model.mockResolvedValueOnce({ output: draft } as never).mockResolvedValueOnce({ output: { supported: false, reason: "Unsupported", supportedSentenceNumbers: [2] } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "What?", [reference])).rejects.toMatchObject({ verificationCode: "claim_rejected" });
});


it("reads all six selected originals and can answer from the fourth and sixth", async () => {
  const refs = Array.from({ length: 6 }, (_, i) => {
    const text = `Original ${i + 1}: I played instrument ${i + 1}.`;
    return { ...reference, sourceId: `vault:${String(i + 1).repeat(8)}-1111-4111-8111-111111111111`, text, end: text.length, url: `https://artist.example/credits/${i + 1}` };
  });
  api.mockReset();
  for (const ref of refs) api.mockResolvedValueOnce({ status: "ok", passage: ref, totalChars: ref.text.length, nextStart: null });
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [
    { text: "They played instrument 4.", evidence: [{ n: 4, quote: "I played instrument 4." }] },
    { text: "They also played instrument 6.", evidence: [{ n: 6, quote: "I played instrument 6." }] },
  ], unanswered: null } } as never).mockResolvedValueOnce({ output: { supported: true, reason: "Both originals establish these credits." } } as never);
  const result = await draftResearchAnswer("artist", "Artist", "What instruments?", refs);
  expect(api).toHaveBeenCalledTimes(6);
  expect(JSON.parse(model.mock.calls[0][0].prompt).originals.map((p: { text: string }) => p.text)).toEqual(refs.map(ref => ref.text));
  expect(JSON.parse(model.mock.calls[1][0].prompt).input.originals).toHaveLength(6);
  expect(result.answer).toBe("They played instrument 4. [4] They also played instrument 6. [6]");
  expect(result.sources.map(source => [source.n, source.sourceId])).toEqual([[4, refs[3].sourceId], [6, refs[5].sourceId]]);
  const totalRequested = api.mock.calls.reduce((sum, [path]) => sum + Number(new URL(path, "https://api.example").searchParams.get("maxChars")), 0);
  expect(totalRequested).toBeLessThanOrEqual(72000);
});

it("rejects more than six references before reading or drafting instead of silently dropping them", async () => {
  await expect(draftResearchAnswer("artist", "Artist", "What?", Array(7).fill(reference))).rejects.toThrow();
  expect(api).not.toHaveBeenCalled();
  expect(model).not.toHaveBeenCalled();
});

it("preserves a full 12000-character selected slice when requesting surrounding context", async () => {
  const text = "x".repeat(11985) + "I played drums.";
  const ref = { ...reference, start: 1500, end: 1500 + text.length, text };
  api.mockImplementation(async path => {
    const start = Number(new URL(path, "https://api.example").searchParams.get("start"));
    const entire = "p".repeat(1500) + text;
    const window = entire.slice(start, start + 12000);
    return { status: "ok", passage: { ...ref, start, end: start + window.length, text: window }, totalChars: entire.length, nextStart: start + window.length < entire.length ? start + window.length : null };
  });
  expect((await draftResearchAnswer("artist", "Artist", "What?", [ref])).answer).toBe("They played drums. [1]");
  expect(api.mock.calls[0][0]).toContain("start=1500&maxChars=12000");
});

it.each([null, "These originals do not establish another activity."])("returns a nonempty limitation for a zero-sentence draft (%s)", async unanswered => {
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [], unanswered } } as never);
  const result = await draftResearchAnswer("artist", "Artist", "What else?", [reference]);
  expect(result.answer).toBe("I don't have enough information to answer that yet.");
  expect(result.sources).toEqual([]);
  expect(model).toHaveBeenCalledTimes(1);
});

it("fails closed when both checked drafts have no independently verified sentence", async () => {
  model.mockReset();
  for (let i = 0; i < 2; i++) model.mockResolvedValueOnce({ output: draft } as never).mockResolvedValueOnce({ output: { supported: false, supportedSentenceNumbers: [], reason: "None answer the question." } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "What else?", [reference])).rejects.toMatchObject({ verificationCode: "claim_rejected" });
  expect(model).toHaveBeenCalledTimes(4);
});

it("rejects a whitespace-only factual sentence rather than returning a citation with no answer", async () => {
  model.mockReset();
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "   ", evidence: [{ n: 1, quote: "I played drums." }] }], unanswered: null } } as never);
  await expect(draftResearchAnswer("artist", "Artist", "What?", [reference])).rejects.toThrow();
  expect(model).toHaveBeenCalledTimes(1);
});

it('shares identical expanded original reads and keeps original citation numbers after deduplication', async () => {
 const duplicate = { ...reference, start: 2, text: reference.text.slice(2) };
 const third = { ...reference, sourceId: 'vault:33333333-3333-4333-8333-333333333333', url: 'https://artist.example/other' };
 api.mockImplementation(async path => ({ status: 'ok', passage: path.includes('33333333') ? third : reference, totalChars: reference.text.length, nextStart: null }));
 model.mockReset();
 model.mockResolvedValueOnce({ output: { sentences: [{ text: 'They played drums.', evidence: [{ n: 1, quote: 'I played drums.' }, { n: 3, quote: 'I played drums.' }] }], unanswered: null } } as never)
  .mockResolvedValueOnce({ output: { supported: true, reason: 'Supported.' } } as never);
 const result = await draftResearchAnswer('artist', 'Artist', 'What did they play?', [reference, duplicate, third]);
 expect(api).toHaveBeenCalledTimes(2);
 const prompt = JSON.parse(model.mock.calls[0][0].prompt);
 expect(prompt.originals.map((p: {n:number}) => p.n)).toEqual([1,3]);
 expect(prompt.originals.map((p: {text:string}) => p.text)).toEqual([reference.text, reference.text]);
 expect(JSON.parse(model.mock.calls[1][0].prompt).input.originals).toEqual(prompt.originals);
 expect(result.answer).toBe('They played drums. [1, 3]');
 expect(result.sources.map(s => [s.n, s.sourceId])).toEqual([[1,reference.sourceId],[3,third.sourceId]]);
});
it('validates every selected slice even when the evidence read is shared', async () => {
 const invalid = { ...reference, start: 2, text: 'X' + reference.text.slice(3) };
 await expect(draftResearchAnswer('artist', 'Artist', 'What did they play?', [reference, invalid])).rejects.toThrow(/changed/);
 expect(api).toHaveBeenCalledTimes(1);
 expect(model).not.toHaveBeenCalled();
});
it('rejects a quote using a removed duplicate citation number before the independent checker', async () => {
 model.mockReset();
 model.mockResolvedValue({ output: { sentences: [{ text: 'They played drums.', evidence: [{ n: 2, quote: 'I played drums.' }] }], unanswered: null } } as never);
 await expect(draftResearchAnswer('artist', 'Artist', 'What did they play?', [reference, reference])).rejects.toThrow(/evidence/);
 expect(api).toHaveBeenCalledTimes(1);
 expect(model.mock.calls.every(([options]) => options.instructions?.startsWith('Answer the listener'))).toBe(true);
});

it('revalidates a short citation with bounded neighboring context rather than reopening twelve thousand characters', async () => {
 await draftResearchAnswer('artist', 'Artist', 'What did they play?', [reference]);
 const url = new URL(api.mock.calls[0][0], 'https://api.example');
 expect(Number(url.searchParams.get('maxChars'))).toBe(reference.end + 1200);
});
