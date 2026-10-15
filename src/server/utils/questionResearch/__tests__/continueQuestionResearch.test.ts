/** @jest-environment node */
import { db } from '@/server/db/drizzle';
import { continueQuestionResearch } from '../continueQuestionResearch';
import { callResearchApi } from '../callResearchApi';
import { bindQuestionRequest } from '../bindQuestionRequest';
import { registerResearchQuestion } from '../registerResearchQuestion';
jest.mock('@/server/db/drizzle', () => ({ db: { execute: jest.fn() } }));
jest.mock('../callResearchApi', () => ({ callResearchApi: jest.fn() }));
jest.mock('../bindQuestionRequest', () => ({ bindQuestionRequest: jest.fn() }));
jest.mock('../registerResearchQuestion', () => ({ registerResearchQuestion: jest.fn() }));
const artistId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222',nextJobId='33333333-3333-4333-8333-333333333333';
const input={artistId,jobId,question:'Where did they record it?',signal:new AbortController().signal};
const routing={topic:'Recording location',evidenceNeed:'reporting',freshness:'stored',retrieval:'relevance',answerScope:'focused',reuseFallbackJobId:jobId};
const row={request_hash:'a'.repeat(64),answer_intent:'Recording location',routing};
const status={status:'ok',jobId:nextJobId,stage:'checking_saved',provider:null,message:'Checking Lore',updatedAt:'2026-10-15',references:[],limitations:[]};
beforeEach(()=>{jest.resetAllMocks();jest.mocked(db.execute).mockResolvedValue([row] as never);jest.mocked(callResearchApi).mockResolvedValue(status);jest.mocked(registerResearchQuestion).mockResolvedValue(true);});
it('continues the admitted routing once after reused originals do not answer the new question',async()=>{
 expect(await continueQuestionResearch(input)).toMatchObject({jobId:nextJobId,stage:'checking_saved'});
 expect(callResearchApi).toHaveBeenCalledWith(`/api/artist/${artistId}/research/questions`,{body:expect.not.objectContaining({reuseFallbackJobId:expect.anything()}),signal:input.signal});
 expect(registerResearchQuestion).toHaveBeenCalledWith(artistId,nextJobId,input.question);
 expect(bindQuestionRequest).toHaveBeenCalledWith(expect.objectContaining({jobId:nextJobId,requestHash:row.request_hash,question:input.question,routing:expect.objectContaining({reuseFallbackJobId:jobId})}));
 expect(db.execute).toHaveBeenCalledTimes(2);
});
it('does not start work for an absent, expired or already leased semantic handoff',async()=>{
 jest.mocked(db.execute).mockResolvedValue([] as never);
 expect(await continueQuestionResearch(input)).toBeNull();expect(callResearchApi).not.toHaveBeenCalled();
});
it('rejects unknown saved routing rather than accepting client hints',async()=>{
 jest.mocked(db.execute).mockResolvedValue([{...row,routing:{...routing,privateMemory:'not permitted'}}] as never);
 await expect(continueQuestionResearch(input)).rejects.toThrow();expect(callResearchApi).not.toHaveBeenCalled();expect(db.execute).toHaveBeenCalledTimes(2);
});
it('does not loop when the ordinary research request resolves to the same saved job',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,jobId});
 expect(await continueQuestionResearch(input)).toBeNull();expect(registerResearchQuestion).not.toHaveBeenCalled();
});
it('retains ordinary per-job registration limits and releases the short lease on failure',async()=>{
 jest.mocked(registerResearchQuestion).mockResolvedValue(false);
 await expect(continueQuestionResearch(input)).rejects.toThrow();expect(bindQuestionRequest).not.toHaveBeenCalled();expect(db.execute).toHaveBeenCalledTimes(2);
});

it('shares an in-flight continuation instead of returning a false absence or starting another plan',async()=>{
 jest.mocked(db.execute).mockReset().mockResolvedValueOnce([] as never).mockResolvedValueOnce([{job_id:jobId,busy:true}] as never);
 expect(await continueQuestionResearch(input)).toEqual({pending:true});expect(callResearchApi).not.toHaveBeenCalled();
});
it('reconnects to the already bound continuation rather than requeueing it',async()=>{
 jest.mocked(db.execute).mockReset().mockResolvedValueOnce([] as never).mockResolvedValueOnce([{job_id:nextJobId,busy:false}] as never);
 expect(await continueQuestionResearch(input)).toMatchObject({jobId:nextJobId});
 expect(callResearchApi).toHaveBeenCalledWith(`/api/artist/${artistId}/research/questions/${nextJobId}`,{signal:input.signal});
 expect(registerResearchQuestion).not.toHaveBeenCalled();
});
