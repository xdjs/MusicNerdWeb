/** @jest-environment node */
import { handleArtistQuestion } from "../handleArtistQuestion";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { planArtistQuestion } from "../planArtistQuestion";
import { callResearchApi } from "../callResearchApi";
import { getOrDraftResearchAnswer } from "../getOrDraftResearchAnswer";
import { registerResearchQuestion } from "../registerResearchQuestion";
jest.mock("@/server/utils/queries/artistQueries", () => ({
  getArtistById: jest.fn(),
}));
jest.mock("../planArtistQuestion", () => ({ planArtistQuestion: jest.fn() }));
jest.mock("../callResearchApi", () => ({ callResearchApi: jest.fn() }));
jest.mock("../getOrDraftResearchAnswer", () => ({ getOrDraftResearchAnswer: jest.fn() }));
jest.mock("../registerResearchQuestion", () => ({ registerResearchQuestion: jest.fn() }));
if (!Response.json)
  Response.json = (body, init) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
const artistId = "11111111-1111-4111-8111-111111111111",
  jobId = "22222222-2222-4222-8222-222222222222";
const status = {
  status: "ok",
  jobId,
  stage: "checking_saved",
  provider: null,
  message: "Checking saved originals",
  updatedAt: "2026-10-06",
  references: [],
  limitations: [],
};
const request = (extra = {}) =>
  new Request("https://web.example/api/askArtist", {
    method: "POST",
    body: JSON.stringify({ artistId, question: "Who played drums?", ...extra }),
  });
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(getArtistById)
    .mockResolvedValue({ id: artistId, name: "Artist" } as never);
  jest.mocked(planArtistQuestion).mockResolvedValue({
    topic: "drum credits",
    evidenceNeed: "credits",
    freshness: "stored",
  });
  jest.mocked(callResearchApi).mockResolvedValue(status);
  jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({ state: "drafting" });
  jest.mocked(registerResearchQuestion).mockResolvedValue(true);
});
it("acknowledges the durable job before any collection or answer call", async () => {
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(202);
  expect((await r.json()).research.jobId).toBe(jobId);
  expect(callResearchApi).toHaveBeenCalledTimes(1);
  expect(registerResearchQuestion).toHaveBeenCalledWith(artistId, jobId, "Who played drums?");
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it("resumes the known artist-scoped job without replanning or enqueueing", async () => {
  const r = await handleArtistQuestion(request({ jobId }));
  expect(r.status).toBe(202);
  expect(planArtistQuestion).not.toHaveBeenCalled();
  expect(callResearchApi).toHaveBeenCalledWith(
    `/api/artist/${artistId}/research/questions/${jobId}`,
    expect.anything(),
  );
});
it("does not generate a guessed answer to an unresolved request", async () => {
  jest
    .mocked(callResearchApi)
    .mockResolvedValue({ ...status, stage: "unresolved" });
  const r = await handleArtistQuestion(request({ jobId }));
  expect((await r.json()).answer).toMatch(/could not establish/i);
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it("rejects invalid request scope before any API/model work", async () => {
  expect(
    (await handleArtistQuestion(request({ artistId: "not-an-id" }))).status,
  ).toBe(400);
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(planArtistQuestion).not.toHaveBeenCalled();
});
it("does not fall back to legacy research after an API failure", async () => {
  jest.mocked(callResearchApi).mockRejectedValue(new Error("private details"));
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("private details");
});
it("treats a cached complete acknowledgement as a job to reopen, never an evidence result", async () => {
  jest
    .mocked(callResearchApi)
    .mockResolvedValue({
      ...status,
      stage: "complete",
      references: [],
      limitations: ["Read current job status to obtain revalidated evidence."],
    });
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(202);
  expect((await r.json()).research.jobId).toBe(jobId);
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it("returns checked saved results without invoking the model in the route", async () => {
  jest.mocked(callResearchApi).mockResolvedValue({ ...status, stage: "complete" });
  jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({ state: "ready", result: {
    answer: "They played drums. [1]", sources: [], instagramMentions: [],
    fromOpenWeb: false, webDomains: [], suggestions: [],
  } });
  const r = await handleArtistQuestion(request({ jobId }));
  expect(r.status).toBe(200);
  expect((await r.json()).answer).toBe("They played drums. [1]");
  expect(getOrDraftResearchAnswer).toHaveBeenCalledWith(expect.objectContaining({ jobId, artistId }));
});
it("tells concurrent pollers the checked answer is still being prepared", async () => {
  jest.mocked(callResearchApi).mockResolvedValue({ ...status, stage: "complete" });
  const r = await handleArtistQuestion(request({ jobId }));
  expect(r.status).toBe(202);
  expect((await r.json()).research.message).toMatch(/checking/i);
});
it("returns a safe verification stage and retry boundary", async () => {
  jest.mocked(callResearchApi).mockResolvedValue({ ...status, stage: "complete" });
  jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({ state: "failed", stage: "claim_check", retryable: true });
  const r = await handleArtistQuestion(request({ jobId }));
  expect(r.status).toBe(503);
  expect((await r.json()).verification).toEqual({ stage: "claim_check", retryable: true });
});
it("rejects an unregistered completed-job question before drafting", async () => {
  jest.mocked(callResearchApi).mockResolvedValue({ ...status, stage: "complete" });
  jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({ state: "unregistered" });
  const r = await handleArtistQuestion(request({ jobId, question: "A different question?" }));
  expect(r.status).toBe(409);
  expect((await r.json()).error).toMatch(/not attached/i);
});
it("enforces the per-job answer budget on initial submission", async () => {
  jest.mocked(registerResearchQuestion).mockResolvedValue(false);
  const r = await handleArtistQuestion(request());
  expect(r.status).toBe(429);
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
