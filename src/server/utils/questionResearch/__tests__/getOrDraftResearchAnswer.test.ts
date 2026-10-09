/** @jest-environment node */
import { createHash } from "node:crypto";
import { db } from "@/server/db/drizzle";
import { draftResearchAnswer } from "../draftResearchAnswer";
import { getOrDraftResearchAnswer } from "../getOrDraftResearchAnswer";

jest.mock("@/server/db/drizzle", () => ({ db: { execute: jest.fn() } }));
jest.mock("../draftResearchAnswer", () => ({ draftResearchAnswer: jest.fn() }));
const execute = jest.mocked(db.execute);
const draft = jest.mocked(draftResearchAnswer);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const ref = {
  sourceId: "vault:33333333-3333-4333-8333-333333333333",
  revision: "a".repeat(64), start: 10, end: 27,
  text: "I played the drums", url: "https://artist.example/interview",
  curation: "approved" as const, evidenceKind: "original_text" as const,
  speaker: "unverified" as const, publishedAt: null, retrievedAt: null, truncated: false,
};
const source = {
  n: 1, title: "artist.example", url: ref.url, sourceId: ref.sourceId,
  revision: ref.revision, start: 0, end: 50, curation: ref.curation,
  evidenceKind: ref.evidenceKind,
};
const result = {
  answer: "They played the drums. [1]", sources: [source],
  instagramMentions: [], fromOpenWeb: false, webDomains: [], suggestions: [],
};
const input = {
  artistId: "11111111-1111-4111-8111-111111111111",
  artistName: "Artist", jobId: "22222222-2222-4222-8222-222222222222",
  question: "Who played drums?", references: [ref],
};
const saved = {
  ...result,
  basis: [{ sourceId: ref.sourceId, revision: ref.revision,
    start: ref.start, end: ref.end, url: ref.url, textHash: hash(ref.text), publishedAt: ref.publishedAt }],
};
beforeEach(() => { jest.resetAllMocks(); draft.mockResolvedValue(result); });
it("saves the first checked answer and returns it unchanged on a later poll", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "ready", result });
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "verified", result: saved }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "ready", result });
  expect(draft).toHaveBeenCalledTimes(1);
});
it("does not launch another draft while a concurrent poller owns the lease", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "drafting", claim_until: new Date(Date.now() + 60_000).toISOString(), attempts: 1 }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "drafting" });
  expect(draft).not.toHaveBeenCalled();
});
it("withholds a cached answer if the API no longer considers its original eligible", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "verified", result: saved }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: [] })).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});
it("records a safe draft failure without returning or replacing a verified answer", async () => {
  draft.mockRejectedValue(Object.assign(new Error("private model details"), { verificationStage: "claim_check" }));
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "failed", stage: "claim_check", retryable: true });
  expect(draft).toHaveBeenCalledTimes(1);
});
it("rejects an unregistered question before any model call", async () => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer({ ...input, question: "A different question?" })).toEqual({ state: "unregistered" });
  expect(draft).not.toHaveBeenCalled();
});
it("keeps citation 2 attached to its exact passage when one source has two windows", async () => {
  const second = { ...ref, start: 50, end: 68, text: "I finished the song" };
  const cited = { ...source, n: 2 };
  draft.mockResolvedValue({ ...result, sources: [cited] });
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "waiting", claim_until: new Date(0).toISOString(), attempts: 0 }] as never)
    .mockResolvedValueOnce([{ claim_token: "token" }] as never)
    .mockResolvedValueOnce([{ job_id: input.jobId }] as never);
  expect((await getOrDraftResearchAnswer({ ...input, references: [ref, second] })).state).toBe("ready");
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "verified", result: {
      ...result, sources: [cited], basis: [{ sourceId: second.sourceId, revision: second.revision,
        start: second.start, end: second.end, url: second.url, textHash: hash(second.text), publishedAt: second.publishedAt }],
    } }] as never);
  expect((await getOrDraftResearchAnswer({ ...input, references: [second, ref] })).state).toBe("ready");
  expect(draft).toHaveBeenCalledTimes(1);
});
it("withholds an old cached answer whose publication-date basis was not recorded", async () => {
  const legacy = { ...saved, basis: saved.basis.map(({ publishedAt: _date, ...b }) => b) };
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{ artist_id: input.artistId, status: "verified", result: legacy }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});
it("withholds a cached answer when date metadata changes without changing original text", async () => {
  execute.mockResolvedValueOnce([] as never).mockResolvedValueOnce([{ artist_id: input.artistId, status: "verified", result: { ...saved, basis: saved.basis.map(b => ({ ...b, publishedAt: "2026-10-05" })) } }] as never);
  expect(await getOrDraftResearchAnswer({ ...input, references: [{ ...ref, publishedAt: "2026-10-06" }] })).toEqual({ state: "unavailable" });
  expect(draft).not.toHaveBeenCalled();
});

it("stops polling when the final drafting lease expired without a recorded outcome", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "drafting", claim_until: new Date(0).toISOString(), attempts: 3 }] as never)
    .mockResolvedValueOnce([] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "failed", stage: "draft", retryable: false });
  expect(draft).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledTimes(2);
});
it("keeps waiting for the live final drafting lease without spending another attempt", async () => {
  execute.mockResolvedValueOnce([] as never)
    .mockResolvedValueOnce([{ artist_id: input.artistId, status: "drafting", claim_until: new Date(Date.now() + 60000).toISOString(), attempts: 3 }] as never);
  expect(await getOrDraftResearchAnswer(input)).toEqual({ state: "drafting" });
  expect(draft).not.toHaveBeenCalled();
});
