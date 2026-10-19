/** @jest-environment node */
jest.mock("../getQuestionVisitorKey",()=>({getQuestionVisitorKey:jest.fn(async()=>"a".repeat(64))}));
import { continueCandidateResearch } from '../continueCandidateResearch';
jest.mock('../continueCandidateResearch',()=>({continueCandidateResearch:jest.fn()}));
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
jest.mock('../getBoundEvidenceFacets',()=>({
  getBoundEvidenceFacets:jest.fn(async()=>({state:'legacy'})),
  legacyQuestionHash:(question:string)=>require('node:crypto').createHash('sha256').update(question).digest('hex'),
}));
import { reserveQuestionPlanning } from "../reserveQuestionPlanning";
jest.mock("../reserveQuestionPlanning",()=>({reserveQuestionPlanning:jest.fn()}));
import { handleArtistQuestion } from "../handleArtistQuestion";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { planArtistQuestion } from "../planArtistQuestion";
import { callResearchApi } from "../callResearchApi";
import { getOrDraftResearchAnswer } from "../getOrDraftResearchAnswer";
import { registerResearchQuestion } from "../registerResearchQuestion";
import { generateText } from "@/server/lib/ai/generateText";
jest.mock("@/server/lib/ai/generateText", () => ({ generateText: jest.fn() }));
jest.mock("ai", () => ({ Output: { object: jest.fn() } }));
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
  jest.mocked(require("../getBoundEvidenceFacets").getBoundEvidenceFacets).mockResolvedValue({state:"legacy"});
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

it("serializes real planner-normalized public scope without planner-only fields or conversation", async () => {
  jest.mocked(getArtistById).mockResolvedValue({ id: artistId, name: "Oriel Loom" } as never);
  jest.mocked(planArtistQuestion).mockImplementation(
    jest.requireActual<typeof import("../planArtistQuestion")>("../planArtistQuestion").planArtistQuestion,
  );
  jest.mocked(generateText).mockResolvedValue({ output: {
    publicSubject: { name: "Oriel Loom", qualifiers: [] },
    topic: "Production credits for Oriel Loom's 2022 album Folded Coast",
    publicConstraints: ["Bellwater trio", "whether Pax Cedar produced Folded Coast"],
    evidenceFacets: ["whether Pax Cedar produced Folded Coast"],
    resolvedQuestion: "Did Pax Cedar produce the Bellwater trio's 2022 Folded Coast?",
    answerIntent: "Pax Cedar credit", contextResolved: true,
    evidenceNeed: "credits", freshness: "stored",
    targetUrl: null, platform: null, fromDate: null, toDate: null,
  }} as never);
  const conversation = [{ question: "Private visitor anecdote must not become a query", answer: "The Bellwater trio's 2022 Folded Coast." }];
  const response = await handleArtistQuestion(request({ question: "Did Pax Cedar produce that recording?", conversation }));
  expect(response.status).toBe(202);
  const options = jest.mocked(callResearchApi).mock.calls[0][1]!;
  const expected = {
    topic: "Production credits for Oriel Loom's 2022 album Folded Coast; Bellwater trio; whether Pax Cedar produced Folded Coast",
    evidenceNeed: "credits", freshness: "stored", retrieval: "relevance", answerScope: "focused", preferDirectEvidence: true,
    evidenceFacets: [{ id: "f1", intent: "whether Pax Cedar produced Folded Coast" }],
  };
  expect(JSON.parse(JSON.stringify(options.body))).toEqual(expected);
  expect(JSON.stringify(options.body)).not.toMatch(/publicConstraints|resolvedQuestion|answerIntent|conversation|Private visitor/);
  expect(bindQuestionRequest).toHaveBeenCalledWith(expect.objectContaining({ routing: {
    topic: expected.topic, evidenceNeed: "credits", freshness: "stored", retrieval: "relevance", answerScope: "focused",
    evidenceFacets: [{ id: "f1", intent: "whether Pax Cedar produced Folded Coast" }],
  }}));
});

it("keeps exact cited URL mapping planner-only while binding the same public facets to the job", async () => {
  const sourceRefs = [{ n: 3, url: "https://interview.example/story" }, { n: 4, url: "https://artist.example/playlist" }];
  jest.mocked(planArtistQuestion).mockResolvedValue({
    topic: "Pete Rango Spotify playlist introduction rationale",
    evidenceNeed: "reporting", freshness: "stored", retrieval: "relevance",
    evidenceFacets: [{ id: "f1", intent: "why the cited Spotify playlist is an introduction" }],
  });
  const conversation = [{ question: "What should I listen to first?", answer: "Spotify list [3]. Site playlist [4].",
    sourceUrls: ["https://artist.example/playlist", "https://interview.example/story"], sourceRefs }];
  const response = await handleArtistQuestion(request({ question: "What makes that a good introduction?", conversation }));
  expect(response.status).toBe(202);
  const body = jest.mocked(callResearchApi).mock.calls[0][1]?.body as Record<string, unknown>;
  expect(body.evidenceFacets).toEqual([{ id: "f1", intent: "why the cited Spotify playlist is an introduction" }]);
  expect(JSON.stringify(body)).not.toContain("sourceRefs");
  expect(JSON.stringify(body)).not.toContain("Site playlist [4]");
  expect(bindQuestionRequest).toHaveBeenCalledWith(expect.objectContaining({
    routing: expect.objectContaining({ evidenceFacets: body.evidenceFacets }),
  }));
});

it("does not start API research or bind reuse when declared public scope needs clarification", async () => {
  jest.mocked(planArtistQuestion).mockImplementation(
    jest.requireActual<typeof import("../planArtistQuestion")>("../planArtistQuestion").planArtistQuestion,
  );
  jest.mocked(generateText).mockResolvedValue({ output: {
    publicSubject: { name: "Artist", qualifiers: [] },
    topic: "x".repeat(150), publicConstraints: ["only the original edition"],
    contextResolved: true, evidenceFacets: ["whether Sora Vale arranged Harbor Glass"], evidenceNeed: "credits", freshness: "stored",
    targetUrl: null, platform: null, fromDate: null, toDate: null,
  }} as never);
  const response = await handleArtistQuestion(request());
  expect(await response.json()).toMatchObject({ answer: expect.stringMatching(/narrow.*public research question/i), sources: [] });
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(registerResearchQuestion).not.toHaveBeenCalled();
  expect(bindQuestionRequest).not.toHaveBeenCalled();
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
    topic: "PPNE NYC creator", evidenceNeed: "credits", freshness: "stored", retrieval: "relevance", preferDirectEvidence: true,
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
it.each([['saved_evidence_quota','daily saved-source answer limit'],['research_busy','busy right now']])('distinguishes %s',async(code,message)=>{
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
it.each([
  {
    scenario: "TikTok speech unsupported by the server route",
    question: "What reason does Ember Folio give aloud in this TikTok for changing the winter show venue?",
    provider: null,
  },
  {
    scenario: "supported Instagram Reel with insufficient saved evidence before collection",
    question: "What reason does the artist give aloud in this Instagram Reel?",
    provider: null,
  },
  {
    scenario: "supported Instagram Reel with insufficient evidence after collection",
    question: "What reason does the artist give aloud in this Instagram Reel?",
    provider: "instagram_reels",
  },
])("reports only the evidence gap for $scenario", async ({ question, provider }) => {
  // The wire status has no capability provenance: even provider:null is ambiguous.
  jest.mocked(callResearchApi).mockResolvedValue({
    ...status,
    stage: "unresolved",
    provider,
    limitations: ["unsupported_speech"],
  });
  const body = await (await handleArtistQuestion(request({ jobId, question }))).json();
  expect(body.answer).toBe("I couldn't establish what was said from the saved sources.");
  expect(body.sources).toEqual([]);
  expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
  expect(planArtistQuestion).not.toHaveBeenCalled();
  expect(registerResearchQuestion).not.toHaveBeenCalled();
  expect(callResearchApi).toHaveBeenCalledTimes(1);
});
it('keeps the quota explanation when unsupported speech is also reported', async () => {
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'unresolved',outsideResearchReason:'quota',limitations:['unsupported_speech']});
 const body=await (await handleArtistQuestion(request({jobId}))).json();
 expect(body.answer).toMatch(/Outside research is at its limit/);
 expect(body.code).toBe('research_quota');
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

it('advances insufficient direct candidates without sending their limitation as a final answer',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete',selection:'candidates'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result:{answer:'Not enough information',sources:[],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]}});
 jest.mocked(continueCandidateResearch).mockResolvedValue({...status,selection:'research'} as never);
 const response=await handleArtistQuestion(request({jobId}));
 expect(response.status).toBe(202);expect((await response.json()).answer).toBeUndefined();
 expect(continueCandidateResearch).toHaveBeenCalledWith(expect.objectContaining({artistId,jobId}));
 expect(continueQuestionResearch).not.toHaveBeenCalled();
});
it('recovers a pending transition after API success and a Web storage interruption',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete',selection:'research'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'continuing'});
 jest.mocked(continueCandidateResearch).mockResolvedValue({pending:true});
 const response=await handleArtistQuestion(request({jobId}));
 expect(response.status).toBe(202);expect(continueCandidateResearch).toHaveBeenCalledTimes(1);
});
it('returns a personal hourly limit with a concrete reset and no model call',async()=>{
 const resetAt=new Date(Date.now()+120000).toISOString();
 jest.mocked(reserveQuestionPlanning).mockRejectedValue(Object.assign(new Error('private'),{status:429,code:'visitor_question_quota',retryAfterSeconds:120,resetAt}));
 const response=await handleArtistQuestion(request());const body=await response.json();
 expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('120');
 expect(response.headers.get('X-MusicNerd-Quota')).toBe('true');
 expect(body).toMatchObject({code:'visitor_question_quota',resetAt,retryAfterSeconds:120});
 expect(body.error).toMatch(/your question limit for this hour/i);expect(planArtistQuestion).not.toHaveBeenCalled();
});
it('labels the global planning cap as site-wide rather than the visitor allowance',async()=>{
 jest.mocked(reserveQuestionPlanning).mockRejectedValue(Object.assign(new Error('private'),{status:429,code:'question_planning_quota',retryAfterSeconds:3600,resetAt:new Date(Date.now()+3600000).toISOString()}));
 const body=await(await handleArtistQuestion(request())).json();
 expect(body.error).toMatch(/Music Nerd.*daily/);expect(body.error).not.toMatch(/your.*limit/i);
});
it('keeps outside-research reset metadata on an otherwise successful saved-source response',async()=>{
 const resetAt=new Date(Date.now()+600000).toISOString();
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'unresolved',outsideResearchReason:'quota',quotaScope:'outside_artist',retryAfterSeconds:600,resetAt});
 const response=await handleArtistQuestion(request({jobId}));const body=await response.json();
 expect(response.status).toBe(200);expect(body).toMatchObject({code:'research_quota',resetAt,retryAfterSeconds:600});
 expect(body.answer).toMatch(/still ask about saved sources/);
});

it('preserves quota reset metadata when semantic fallback needs a new saved admission', async () => {
 const resetAt = new Date(Date.now() + 600000).toISOString();
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'complete'});
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result:{answer:'Not enough information.',sources:[],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]}});
 jest.mocked(continueQuestionResearch).mockRejectedValue(Object.assign(new Error('private'),{status:429,code:'saved_evidence_quota',retryAfterSeconds:600,resetAt}));
 const response = await handleArtistQuestion(request({jobId}));
 expect(response.status).toBe(429);
 expect(response.headers.get('Retry-After')).toBe('600');
 expect(await response.json()).toMatchObject({code:'saved_evidence_quota',resetAt,retryAfterSeconds:600});
 expect(reserveQuestionPlanning).not.toHaveBeenCalled();
});

it("serializes the separately extracted public subject without forwarding private setup", async () => {
  jest.mocked(getArtistById).mockResolvedValue({ id: artistId, name: "Tidal Orchard" } as never);
  jest.mocked(planArtistQuestion).mockImplementation(jest.requireActual<typeof import("../planArtistQuestion")>("../planArtistQuestion").planArtistQuestion);
  jest.mocked(generateText).mockResolvedValue({ output: {
    publicSubject: { name: "Tidal Orchard", qualifiers: ["Lisbon instrumental duo"] },
    topic: "Harbor Glass arranging credits", publicConstraints: ["whether Sora Vale arranged Harbor Glass"],
    resolvedQuestion: "Did Sora Vale arrange Harbor Glass by the Lisbon instrumental duo Tidal Orchard?",
    contextResolved: true, evidenceFacets: ["whether Sora Vale arranged Harbor Glass"], evidenceNeed: "credits", freshness: "stored",
    targetUrl: null, platform: null, fromDate: null, toDate: null,
  }} as never);
  const response = await handleArtistQuestion(request({ question: "Did Sora arrange that duo's record?",
    conversation: [{ question: "Private visitor appointment: 18:45 at my home. I mean the Lisbon instrumental duo Tidal Orchard.", answer: "Their record is Harbor Glass." }] }));
  expect(response.status).toBe(202);
  const body = JSON.parse(JSON.stringify(jest.mocked(callResearchApi).mock.calls[0][1]!.body));
  expect(body).toEqual({ topic: "Harbor Glass arranging credits; Tidal Orchard; Lisbon instrumental duo; whether Sora Vale arranged Harbor Glass",
    evidenceNeed: "credits", freshness: "stored", retrieval: "relevance", answerScope: "focused", preferDirectEvidence: true, evidenceFacets: [{id:"f1",intent:"whether Sora Vale arranged Harbor Glass"}] });
  expect(JSON.stringify(body)).not.toMatch(/publicSubject|qualifiers|publicConstraints|conversation|resolvedQuestion|Private visitor|18:45|my home/);
  expect(generateText).toHaveBeenCalledTimes(1);
});

it("does not dispatch or bind when the actual planner response omits the required public subject", async () => {
  jest.mocked(planArtistQuestion).mockImplementation(jest.requireActual<typeof import("../planArtistQuestion")>("../planArtistQuestion").planArtistQuestion);
  jest.mocked(generateText).mockResolvedValue({ output: {
    topic: "Artist recording credits", publicConstraints: [],
    evidenceNeed: "credits", freshness: "stored", contextResolved: true,
    targetUrl: null, platform: null, fromDate: null, toDate: null,
  }} as never);
  const response = await handleArtistQuestion(request());
  expect(response.status).toBe(503);
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(bindQuestionRequest).not.toHaveBeenCalled();
  expect(registerResearchQuestion).not.toHaveBeenCalled();
});

it("does not dispatch when the model substitutes another artist as the public subject", async () => {
  jest.mocked(planArtistQuestion).mockImplementation(jest.requireActual<typeof import("../planArtistQuestion")>("../planArtistQuestion").planArtistQuestion);
  jest.mocked(generateText).mockResolvedValue({ output: {
    publicSubject: { name: "Other Artist", qualifiers: ["the solo performer"] },
    topic: "Artist recording credits", evidenceNeed: "credits", freshness: "stored",
    targetUrl: null, platform: null, fromDate: null, toDate: null,
  }} as never);
  expect((await handleArtistQuestion(request())).status).toBe(503);
  expect(callResearchApi).not.toHaveBeenCalled();
  expect(bindQuestionRequest).not.toHaveBeenCalled();
  expect(registerResearchQuestion).not.toHaveBeenCalled();
});
