/** @jest-environment node */
import { continueQuestionResearch } from '../continueQuestionResearch';
jest.mock('../continueQuestionResearch',()=>({continueQuestionResearch:jest.fn()}));
import { listReusableQuestionCandidates } from '../listReusableQuestionCandidates';
jest.mock('../listReusableQuestionCandidates',()=>({listReusableQuestionCandidates:jest.fn()}));
import { releaseQuestionRequest } from '../releaseQuestionRequest';
jest.mock('../releaseQuestionRequest',()=>({releaseQuestionRequest:jest.fn()}));
import { reuseQuestionRequest } from '../reuseQuestionRequest';
import { bindQuestionRequest } from '../bindQuestionRequest';
jest.mock('../reuseQuestionRequest',()=>({reuseQuestionRequest:jest.fn()}));
jest.mock('../bindQuestionRequest',()=>({bindQuestionRequest:jest.fn()}));
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
  jest.mocked(continueQuestionResearch).mockResolvedValue(null);
  jest.mocked(listReusableQuestionCandidates).mockResolvedValue([]);
  jest.mocked(releaseQuestionRequest).mockResolvedValue(undefined);
  jest.mocked(reuseQuestionRequest).mockResolvedValue({state:'claimed',requestHash:'hash',token:'token'});
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
  expect(jest.mocked(planArtistQuestion).mock.calls[0].filter((_, i) => i !== 2)).toEqual(["Artist", "Who created it?", conversation, []]);
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

it('returns an eligible saved answer before planning admission even when the planner quota is exhausted', async () => {
  jest.mocked(reserveQuestionPlanning).mockRejectedValue(Object.assign(new Error('quota'), {status:429}));
  jest.mocked(reuseQuestionRequest).mockResolvedValue({state:'ready',requestHash:'hash',result:{answer:'Saved verified answer',sources:[],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]},limitations:[]});
  const response = await handleArtistQuestion(request());
  expect(response.status).toBe(200);
  expect((await response.json()).answer).toBe('Saved verified answer');
  expect(reserveQuestionPlanning).not.toHaveBeenCalled();
  expect(planArtistQuestion).not.toHaveBeenCalled();
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it('does not spend planning allowance for a concurrent identical request', async () => {
 jest.mocked(reuseQuestionRequest).mockResolvedValue({state:'busy',requestHash:'hash'});
 const response=await handleArtistQuestion(request());
 expect(response.status).toBe(429);
 expect((await response.json()).code).toBe('research_busy');
 expect(reserveQuestionPlanning).not.toHaveBeenCalled();
 expect(planArtistQuestion).not.toHaveBeenCalled();
});
it.each<Record<string, string>>([{retrieval:'latest'},{freshness:'recent'},{fromDate:'2026-01-01'},{toDate:'2026-01-01'}])('does not mark time-sensitive plans reusable: %j', async constraint => {
 jest.mocked(planArtistQuestion).mockResolvedValue({topic:'artist activity',freshness:'stored',...constraint});
 await handleArtistQuestion(request());
 expect(bindQuestionRequest).toHaveBeenCalledWith(expect.objectContaining({reusable:false}));
});

it('releases an unfinished lease after a planning quota rejection without planning',async()=>{
 jest.mocked(reserveQuestionPlanning).mockRejectedValue(Object.assign(new Error('quota'),{status:429,code:'question_planning_quota'}));
 expect((await handleArtistQuestion(request())).status).toBe(429);
 expect(releaseQuestionRequest).toHaveBeenCalledWith(artistId,'hash','token');
 expect(planArtistQuestion).not.toHaveBeenCalled();
});
const candidate = {id:'candidate',jobId,questionHash:'a'.repeat(64),intent:'Identify the producer of Glass Harbor',routing:{topic:'Glass Harbor producer',evidenceNeed:'credits',freshness:'stored',retrieval:'relevance',answerScope:'focused'},answer:'Ari produced Glass Harbor.',passages:[{text:'Glass Harbor was produced by Ari in Studio C.',url:'https://example.com/credits',evidenceKind:'original_text'}]};
it('uses one admitted planner for a new equivalent wording, then revalidates before binding its alias',async()=>{
 jest.mocked(listReusableQuestionCandidates).mockResolvedValue([candidate]);
 jest.mocked(planArtistQuestion).mockResolvedValue({...candidate.routing,answerIntent:candidate.intent,reuseCandidateId:candidate.id,reuseAction:'same_answer'});
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 const result={answer:candidate.answer,sources:[{n:1,title:'Credits',url:'https://example.com/credits',sourceId:'vault:33333333-3333-4333-8333-333333333333',revision:'a'.repeat(64),start:0,end:10,curation:'approved' as const,evidenceKind:'original_text' as const}],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]};
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result});
 const response=await handleArtistQuestion(request({question:'Who is the producer on Glass Harbor?'}));
 expect(response.status).toBe(202);
 expect((await response.json()).research).toMatchObject({jobId,stage:'complete'});
 expect(reserveQuestionPlanning).toHaveBeenCalledTimes(1);
 expect(planArtistQuestion).toHaveBeenCalledTimes(1);
 expect(callResearchApi).toHaveBeenCalledTimes(1);
 expect(callResearchApi).toHaveBeenCalledWith(`/api/artist/${artistId}/research/questions/${jobId}`,expect.anything());
 expect(registerResearchQuestion).toHaveBeenCalledWith(artistId,jobId,'Who is the producer on Glass Harbor?');
 expect(getOrDraftResearchAnswer).toHaveBeenCalledTimes(1);
 expect(getOrDraftResearchAnswer).toHaveBeenLastCalledWith(expect.objectContaining({readOnlyQuestionHash:candidate.questionHash}));
 expect(bindQuestionRequest).toHaveBeenCalledWith(expect.not.objectContaining({questionHash:candidate.questionHash}));
});
it('adapts a supported different angle through the existing answer registration and checking lane',async()=>{
 jest.mocked(listReusableQuestionCandidates).mockResolvedValue([candidate]);
 jest.mocked(planArtistQuestion).mockResolvedValue({...candidate.routing,evidenceNeed:'reporting',answerIntent:'Identify the recording location of Glass Harbor',reuseCandidateId:candidate.id,reuseAction:'adapt_evidence'});
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result:{answer:'It was recorded at Studio C.',sources:[{n:1,title:'Credits',url:'https://example.com/credits',sourceId:'vault:33333333-3333-4333-8333-333333333333',revision:'a'.repeat(64),start:0,end:10,curation:'approved',evidenceKind:'original_text'}],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]}});
 expect((await handleArtistQuestion(request({question:'Where was Glass Harbor recorded?'}))).status).toBe(202);
 expect(registerResearchQuestion).toHaveBeenCalledWith(artistId,jobId,'Where was Glass Harbor recorded?');
 expect(bindQuestionRequest).toHaveBeenCalledWith(expect.not.objectContaining({questionHash:candidate.questionHash}));
 expect(callResearchApi).toHaveBeenCalledTimes(1);
});
it.each(['wrong-candidate','changed-platform','latest','revoked'])('falls through safely instead of replaying %s',async mode=>{
 jest.mocked(listReusableQuestionCandidates).mockResolvedValue([candidate]);
 jest.mocked(planArtistQuestion).mockResolvedValue({...candidate.routing,answerIntent:candidate.intent,reuseCandidateId:mode==='wrong-candidate'?'injected':candidate.id,reuseAction:'same_answer',...(mode==='changed-platform'?{platform:'instagram'}:{}),...(mode==='latest'?{retrieval:'latest'}:{})});
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:mode==='revoked'?'unresolved':'checking_saved'});
 const response=await handleArtistQuestion(request());
 expect(response.status).toBe(202);
 expect(callResearchApi).toHaveBeenLastCalledWith(`/api/artist/${artistId}/research/questions`,expect.objectContaining({body:expect.not.objectContaining({reuseCandidateId:expect.anything(),answerIntent:expect.anything()})}));
 expect(registerResearchQuestion).toHaveBeenCalled();
});

it('does not treat model equivalence as permission to return the previous version answer',async()=>{
 jest.mocked(listReusableQuestionCandidates).mockResolvedValue([candidate]);
 jest.mocked(planArtistQuestion).mockResolvedValue({...candidate.routing,answerIntent:'Identify released-recording producer of Glass Harbor',reuseCandidateId:candidate.id,reuseAction:'same_answer'});
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 const base={sources:[{n:1,title:'Credits',url:'https://example.com/credits',sourceId:'vault:33333333-3333-4333-8333-333333333333',revision:'a'.repeat(64),start:0,end:10,curation:'approved' as const,evidenceKind:'original_text' as const}],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]};
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValueOnce({state:'ready',result:{...base,answer:'Mira produced the demo.'}}).mockResolvedValueOnce({state:'ready',result:{...base,answer:'Rowan produced the released recording.'}});
 const response=await handleArtistQuestion(request({question:'Who produced the released recording of Glass Harbor?'}));
 expect(response.status).toBe(202);
 expect(await response.json()).toMatchObject({research:{jobId,resolvedQuestion:'Who produced the released recording of Glass Harbor?'}});
 expect(getOrDraftResearchAnswer).toHaveBeenCalledTimes(1);
});
it('falls through to normal research when the checked originals do not answer the new angle',async()=>{
 jest.mocked(listReusableQuestionCandidates).mockResolvedValue([candidate]);
 jest.mocked(planArtistQuestion).mockResolvedValue({...candidate.routing,answerIntent:'Identify studio location',reuseCandidateId:candidate.id,reuseAction:'adapt_evidence'});
 jest.mocked(callResearchApi).mockResolvedValueOnce({...status,stage:'complete'}).mockResolvedValueOnce(status);
 const result={answer:'I could not confirm that.',sources:[],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]};
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result});
 const response=await handleArtistQuestion(request({question:'Where was it recorded?',conversation:[{question:'Which record?',answer:'Glass Harbor'}]}));
 expect(response.status).toBe(202);
 expect(callResearchApi).toHaveBeenLastCalledWith(`/api/artist/${artistId}/research/questions`,expect.objectContaining({body:expect.any(Object)}));
 expect(reserveQuestionPlanning).toHaveBeenCalledTimes(1);
 expect(planArtistQuestion).toHaveBeenCalledTimes(1);
});

it('asks for missing context without queuing research or drafting an answer',async()=>{
 jest.mocked(planArtistQuestion).mockResolvedValue({clarification:'Which release do you mean?'});
 const response=await handleArtistQuestion(request({question:'Who produced it?'}));
 expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({answer:'Which release do you mean?',sources:[]});
 expect(callResearchApi).not.toHaveBeenCalled();
 expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
 expect(registerResearchQuestion).not.toHaveBeenCalled();
 expect(releaseQuestionRequest).toHaveBeenCalled();
});

it('result endpoint retains registered-question guards without planning or enqueueing', async () => {
 const { POST } = await import('@/app/api/artist/[id]/questionResearch/[jobId]/answer/route');
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'unregistered'});
 const response=await POST(new Request('https://web.example/result',{method:'POST',body:JSON.stringify({question:'Unregistered different question?'})}),{params:Promise.resolve({id:artistId,jobId})});
 expect(response.status).toBe(409);
 expect(planArtistQuestion).not.toHaveBeenCalled();expect(reserveQuestionPlanning).not.toHaveBeenCalled();expect(registerResearchQuestion).not.toHaveBeenCalled();expect(reuseQuestionRequest).not.toHaveBeenCalled();
 expect(callResearchApi).toHaveBeenCalledTimes(1);
 expect(callResearchApi).toHaveBeenCalledWith(`/api/artist/${artistId}/research/questions/${jobId}`,expect.objectContaining({signal:expect.anything()}));
 expect(getOrDraftResearchAnswer).toHaveBeenCalledWith(expect.objectContaining({artistId,jobId,question:'Unregistered different question?'}));
});
it('result endpoint never drafts after a wrong-artist job is rejected by the public API', async () => {
 const { POST } = await import('@/app/api/artist/[id]/questionResearch/[jobId]/answer/route');
 jest.mocked(callResearchApi).mockRejectedValue(Object.assign(new Error('Not found'),{status:404}));
 const response=await POST(new Request('https://web.example/result',{method:'POST',body:JSON.stringify({question:'Question?'})}),{params:Promise.resolve({id:artistId,jobId})});
 expect(response.status).toBe(503);expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();expect(planArtistQuestion).not.toHaveBeenCalled();expect(registerResearchQuestion).not.toHaveBeenCalled();
});

it('continues ordinary research after a deferred semantic answer has no cited facts',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result:{answer:'Not enough information.',sources:[],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]}});
 jest.mocked(continueQuestionResearch).mockResolvedValue({...status,jobId:'33333333-3333-4333-8333-333333333333'} as never);
 const response=await handleArtistQuestion(request({jobId}));
 expect(response.status).toBe(202);
 expect((await response.json()).research.jobId).toBe('33333333-3333-4333-8333-333333333333');
 expect(planArtistQuestion).not.toHaveBeenCalled();expect(reserveQuestionPlanning).not.toHaveBeenCalled();
});
