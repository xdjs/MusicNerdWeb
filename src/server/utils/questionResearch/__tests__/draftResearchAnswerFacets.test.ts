/** @jest-environment node */
import { draftResearchAnswer } from "../draftResearchAnswer";
import { generateText } from "@/server/lib/ai/generateText";
import { callResearchApi } from "../callResearchApi";

jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("../callResearchApi", () => ({ callResearchApi: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));

const model = jest.mocked(generateText);
const api = jest.mocked(callResearchApi);
const source = {
  sourceId: "vault:11111111-1111-4111-8111-111111111111",
  revision: "a".repeat(64), start: 0, end: "The EP's title track uses hand-played drums and a warm bass line.".length,
  text: "The EP's title track uses hand-played drums and a warm bass line.",
  url: "https://artist.example/ep-notes", curation: "approved" as const,
  evidenceKind: "original_text" as const, speaker: "not_applicable" as const,
  publishedAt: null, retrievedAt: null, truncated: false,
};
const facets = [
  { id: "f1", intent: "the title track's hand-played drum sound" },
  { id: "f2", intent: "why this EP is a useful place to start" },
];

beforeEach(() => {
  jest.resetAllMocks();
  api.mockResolvedValue({ status: "ok", passage: { ...source, end: source.text.length }, totalChars: source.text.length, nextStart: null } as never);
});

it("keeps a factually checked one-facet answer and reports the other validated facet without another draft cycle", async () => {
  model.mockResolvedValueOnce({ output: {
    sentences: [{ text: "The title track pairs hand-played drums with a warm bass line.", evidence: [{ n: 1, quote: "hand-played drums and a warm bass line" }] }],
    unanswered: "A useful starting point is not established by the supplied evidence.",
  } } as never).mockResolvedValueOnce({ output: {
    supported: true, supportedSentenceNumbers: [1], coveredFacetIds: ["f1"], missingFacetIds: ["f2"], reason: "Supported."
  } } as never);

  const result = await draftResearchAnswer("artist", "Artist", "Describe the title track and say whether this EP is a useful place to start.", [source as never], undefined, {
    evidenceFacets: facets,
    facetCoverage: [{ id: "f1", referenceIndexes: [0] }, { id: "f2", referenceIndexes: [] }],
  });

  expect(result.answer).toBe("The title track pairs hand-played drums with a warm bass line. [1] This answer leaves this part unresolved: why this EP is a useful place to start.");
  expect(result.answer).not.toContain("A useful starting point is not established");
  expect(result.sources.map(item => item.n)).toEqual([1]);
  expect(result.facetAssessment).toEqual({ coveredFacetIds: ["f1"], missingFacetIds: ["f2"] });
  expect(model).toHaveBeenCalledTimes(2);
});

it("preserves the zero-sentence continuation path and skips the checker even with facets", async () => {
  model.mockResolvedValueOnce({ output: { sentences: [], unanswered: "There is no information anywhere." } } as never);
  const result = await draftResearchAnswer("artist", "Artist", "Where should I start?", [source as never], undefined, {
    evidenceFacets: [{ id: "f1", intent: facets[1].intent }], facetCoverage: [{ id: "f1", referenceIndexes: [] }],
  });
  expect(result.answer).toBe("I don't have enough information to answer that yet.");
  expect(result.sources).toEqual([]);
  expect(model).toHaveBeenCalledTimes(1);
});

it("fails closed on an API coverage index outside the final references array", async () => {
  await expect(draftResearchAnswer("artist", "Artist", "Where should I start?", [source as never], undefined, {
    evidenceFacets: [{ id: "f1", intent: facets[1].intent }], facetCoverage: [{ id: "f1", referenceIndexes: [1] }],
  })).rejects.toMatchObject({ verificationCode: "facet_mismatch" });
  expect(model).not.toHaveBeenCalled();
});

it("maps a selected duplicate back to the surviving reopened citation number", async () => {
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "The title track uses hand-played drums.", evidence: [{ n: 1, quote: "hand-played drums" }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: true, supportedSentenceNumbers: [1], coveredFacetIds: ["f1"], missingFacetIds: [], reason: "Supported." } } as never);
  const duplicate = { ...source };
  const result = await draftResearchAnswer("artist", "Artist", "Describe the title track's drums.", [source as never, duplicate as never], undefined, {
    evidenceFacets: [{ id: "f1", intent: "the title track's drum sound" }],
    facetCoverage: [{ id: "f1", referenceIndexes: [1] }],
  });
  const writerInput = JSON.parse(model.mock.calls[0][0].prompt as string);
  expect(writerInput.evidenceFacets[0].reopenedOriginalNumbers).toEqual([1]);
  expect(result.answer).toBe("The title track uses hand-played drums. [1]");
});

it("keeps similarly named collections attached to their separate reopened sources", async () => {
  const interviewText = "The Spotify playlist gathers releases into a compact snapshot for a new listener.";
  const siteText = "The official site's featured playlist highlights live session recordings.";
  const interview = { ...source, end: interviewText.length, text: interviewText, url: "https://interview.example/story" };
  const site = { ...source, sourceId: "vault:22222222-2222-4222-8222-222222222222", end: siteText.length, text: siteText, url: "https://artist.example/featured-playlist" };
  api.mockResolvedValueOnce({ status: "ok", passage: interview, totalChars: interviewText.length, nextStart: null } as never)
    .mockResolvedValueOnce({ status: "ok", passage: site, totalChars: siteText.length, nextStart: null } as never);
  model.mockResolvedValueOnce({ output: { sentences: [{ text: "The interview's Spotify list gathers releases into a snapshot for a new listener.", evidence: [{ n: 1, quote: "gathers releases into a compact snapshot for a new listener" }] }], unanswered: null } } as never)
    .mockResolvedValueOnce({ output: { supported: true, supportedSentenceNumbers: [1], coveredFacetIds: ["f1"], missingFacetIds: [], reason: "The cited passage describes the interview's list." } } as never);
  await draftResearchAnswer("artist", "Artist", "Why is the Spotify list in the interview a useful introduction?", [interview as never, site as never], undefined, {
    evidenceFacets: [{ id: "f1", intent: "why the interview's Spotify list is a useful introduction" }],
    facetCoverage: [{ id: "f1", referenceIndexes: [0] }],
  });
  const writerInput = JSON.parse(model.mock.calls[0][0].prompt as string);
  expect(writerInput.originals.map((original: { url: string }) => original.url)).toEqual([interview.url, site.url]);
  expect(writerInput.evidenceFacets[0].reopenedOriginalNumbers).toEqual([1]);
  const checkerInput = JSON.parse(model.mock.calls[1][0].prompt as string);
  expect(checkerInput.input.originals.map((original: { url: string }) => original.url)).toEqual([interview.url, site.url]);
});

it("rejects a checker that omits or duplicates facet IDs instead of silently treating it as complete", async () => {
  for (const verdict of [
    { coveredFacetIds: ["f1"], missingFacetIds: [] },
    { coveredFacetIds: ["f1"], missingFacetIds: ["f1", "f2"] },
  ]) {
    model.mockReset();
    model.mockResolvedValueOnce({ output: { sentences: [{ text: "The track uses hand-played drums.", evidence: [{ n: 1, quote: "hand-played drums" }] }], unanswered: null } } as never)
      .mockResolvedValueOnce({ output: { supported: true, supportedSentenceNumbers: [1], ...verdict, reason: "Supported." } } as never);
    await expect(draftResearchAnswer("artist", "Artist", "Describe both requested details.", [source as never], undefined, {
      evidenceFacets: facets,
      facetCoverage: [{ id: "f1", referenceIndexes: [0] }, { id: "f2", referenceIndexes: [] }],
    })).rejects.toMatchObject({ verificationCode: "facet_check_rejected" });
    expect(model).toHaveBeenCalledTimes(2);
  }
});
