/** @jest-environment node */
import { reuseQuestionRequest } from '../reuseQuestionRequest';
import { acquireQuestionRequest } from '../acquireQuestionRequest';
import { callResearchApi } from '../callResearchApi';
import { getOrDraftResearchAnswer } from '../getOrDraftResearchAnswer';
jest.mock('../acquireQuestionRequest',()=>({acquireQuestionRequest:jest.fn()}));
jest.mock('../callResearchApi',()=>({callResearchApi:jest.fn()}));
jest.mock('../getOrDraftResearchAnswer',()=>({getOrDraftResearchAnswer:jest.fn()}));
const artistId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const input={artistId,artistName:'Example',question:'Who produced Glass Harbor?'};
const binding={token:'old',job_id:jobId,question_hash:'a'.repeat(64),reusable:true,busy:false};
const status={status:'ok',jobId,stage:'complete',provider:null,message:'Complete',updatedAt:'2026-10-12',references:[],limitations:[]};
beforeEach(()=>{jest.resetAllMocks();jest.mocked(acquireQuestionRequest).mockResolvedValueOnce({state:'bound',binding});jest.mocked(callResearchApi).mockResolvedValue(status);});
it('revalidates API originals then only reads the bound verified answer hash',async()=>{
 const result={answer:'Ari produced it.',sources:[{n:1,title:'Credits',url:'https://example.com/credits',sourceId:'vault:33333333-3333-4333-8333-333333333333',revision:'a'.repeat(64),start:0,end:10,curation:'approved' as const,evidenceKind:'original_text' as const}],instagramMentions:[],fromOpenWeb:false,webDomains:[],suggestions:[]};
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state:'ready',result});
 expect(await reuseQuestionRequest(input)).toMatchObject({state:'ready',result});
 expect(getOrDraftResearchAnswer).toHaveBeenCalledWith(expect.objectContaining({jobId,readOnlyQuestionHash:binding.question_hash,references:[]}));
 expect(acquireQuestionRequest).toHaveBeenCalledTimes(1);
});
it.each(['unavailable','unregistered'])('replans on %s originals or abandoned answer rather than using or stranding it',async state=>{
 jest.mocked(getOrDraftResearchAnswer).mockResolvedValue({state} as never);
 jest.mocked(acquireQuestionRequest).mockResolvedValueOnce({state:'claimed',token:'new'});
 expect(await reuseQuestionRequest(input)).toMatchObject({state:'claimed',token:'new'});
 expect(acquireQuestionRequest).toHaveBeenLastCalledWith(artistId,expect.any(String),'old');
});
it('reports active research as busy without starting another planner',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,stage:'checking_saved'});
 expect(await reuseQuestionRequest(input)).toMatchObject({state:'busy'});
 expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it('does not serve a date-sensitive binding even if its old originals are still available',async()=>{
 jest.mocked(acquireQuestionRequest).mockReset().mockResolvedValueOnce({state:'bound',binding:{...binding,reusable:false}}).mockResolvedValueOnce({state:'claimed',token:'new'});
 expect(await reuseQuestionRequest(input)).toMatchObject({state:'claimed'});
 expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
it('fails closed when eligibility cannot be read',async()=>{
 jest.mocked(callResearchApi).mockRejectedValue(new Error('API down'));
 await expect(reuseQuestionRequest(input)).rejects.toThrow('API down');
 expect(getOrDraftResearchAnswer).not.toHaveBeenCalled();
});
