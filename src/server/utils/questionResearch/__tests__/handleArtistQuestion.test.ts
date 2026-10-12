/** @jest-environment node */
import { reserveQuestionPlanning } from "../reserveQuestionPlanning";
jest.mock("../reserveQuestionPlanning",()=>({reserveQuestionPlanning:jest.fn()}));
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
  expect((await r.json()).answer).toMatch(/not have enough information|don.t have enough information/i);
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
it("binds a follow-up's standalone question to its job and does not send chat history to the API", async () => {
  const conversation = [{ question: "What was the post about?", answer: "The PPNE NYC visualizer." }];
  jest.mocked(planArtistQuestion).mockResolvedValue({
    topic: "PPNE NYC creator", evidenceNeed: "credits", freshness: "stored",
    retrieval: "relevance", resolvedQuestion: "Who created the PPNE NYC visualizer?",
  });
  const r = await handleArtistQuestion(request({ question: "Who created it?", conversation }));
  expect(r.status).toBe(202);
  expect(jest.mocked(planArtistQuestion).mock.calls[0].filter((_, i) => i !== 2)).toEqual(["Artist", "Who created it?", conversation]);
  expect(callResearchApi).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: {
    topic: "PPNE NYC creator", evidenceNeed: "credits", freshness: "stored", retrieval: "relevance",
  } }));
  expect(registerResearchQuestion).toHaveBeenCalledWith(artistId, jobId, "Who created the PPNE NYC visualizer?");
  expect((await r.json()).research.resolvedQuestion).toBe("Who created the PPNE NYC visualizer?");
});
it.each([
  { conversation: Array.from({ length: 5 }, () => ({ question: "q", answer: "a" })) },
  { conversation: [{ question: "q", answer: "a".repeat(3001) }] },
  { conversation: [{ question: "q", answer: "a", privateMemory: "secret" }] },
  { conversation: Array.from({ length: 4 }, () => ({ question: "q".repeat(500), answer: "a".repeat(3000) })) },
  { interviewMemory: "must never be accepted" },
])("rejects invalid conversation context before any provider work %#", async (extra) => {
  const r = await handleArtistQuestion(request(extra));
  expect(r.status).toBe(400);
  expect(planArtistQuestion).not.toHaveBeenCalled();
  expect(callResearchApi).not.toHaveBeenCalled();
});
it('explains outside quota separately from missing saved evidence',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'unresolved',outsideResearchReason:'quota'});
 const body=await (await handleArtistQuestion(request({jobId}))).json();
 expect(body.answer).toMatch(/saved sources.*Outside research is at its limit/);expect(body.research.outsideResearchReason).toBe('quota');expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it.each([['saved_evidence_quota','saved-source answer limit'],['research_busy','busy right now']])('distinguishes %s',async(code,message)=>{
 jest.mocked(callResearchApi).mockRejectedValue(Object.assign(new Error('private details'),{status:429,code}));
 const body=await (await handleArtistQuestion(request())).json();expect(body.error).toContain(message);expect(body.code).toBe(code);
});

it('does not plan after bounded planning admission is denied',async()=>{jest.mocked(reserveQuestionPlanning).mockRejectedValue(Object.assign(new Error('limit'),{status:429,code:'question_planning_quota'}));expect((await handleArtistQuestion(request())).status).toBe(429);expect(planArtistQuestion).not.toHaveBeenCalled();expect(callResearchApi).not.toHaveBeenCalled()});
it('polls an existing job without spending a planning reservation',async()=>{await handleArtistQuestion(request({jobId}));expect(reserveQuestionPlanning).not.toHaveBeenCalled()});
it('explains when the requested provider needs a refresh without claiming no information exists', async () => {
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'unresolved',limitations:['provider_latest_refresh_required']});
 const body=await (await handleArtistQuestion(request({jobId}))).json();
 expect(body.answer).toMatch(/saved information from that source/);
 expect(body.answer).toMatch(/refresh/);
 expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it('returns an operational error rather than an answer for a failed research job',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'failed'});
 const r=await handleArtistQuestion(request({jobId}));
 expect(r.status).toBe(503);const body=await r.json();expect(body).toMatchObject({retryFromStart:true});expect(body).not.toHaveProperty('answer');
});
