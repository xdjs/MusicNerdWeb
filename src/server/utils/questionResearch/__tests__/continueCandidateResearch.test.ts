/** @jest-environment node */
import { db } from '@/server/db/drizzle';
import { continueCandidateResearch } from '../continueCandidateResearch';
import { callResearchApi } from '../callResearchApi';
jest.mock('@/server/db/drizzle', () => ({ db: { execute: jest.fn() } }));
jest.mock('../callResearchApi', () => ({ callResearchApi: jest.fn() }));
const artistId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const input={artistId,jobId,question:'Who played bass?',signal:new AbortController().signal};
const status={status:'ok',jobId,selection:'research',stage:'checking_saved',provider:null,message:'Checking Lore',updatedAt:'2026-10-15',references:[],limitations:[]};
beforeEach(()=>{jest.resetAllMocks();jest.mocked(db.execute).mockResolvedValue([{job_id:jobId}] as never);jest.mocked(callResearchApi).mockResolvedValue(status);});
it('continues the same job without registering another question or sending client routing',async()=>{
 expect(await continueCandidateResearch(input)).toMatchObject({jobId,selection:'research'});
 expect(callResearchApi).toHaveBeenCalledWith(`/api/artist/${artistId}/research/questions/${jobId}/continue`,{body:{},signal:input.signal});
 expect(db.execute).toHaveBeenCalledTimes(3);
});
it('joins an active transition and does not overwrite an answer lease',async()=>{
 jest.mocked(db.execute).mockResolvedValueOnce([] as never);
 expect(await continueCandidateResearch(input)).toEqual({pending:true});
 expect(callResearchApi).not.toHaveBeenCalled();
});
it('retains a recoverable transition when the API outcome is uncertain',async()=>{
 jest.mocked(callResearchApi).mockRejectedValue(new Error('Connection lost'));
 await expect(continueCandidateResearch(input)).rejects.toThrow('Connection lost');
 expect(db.execute).toHaveBeenCalledTimes(2);
});
it('does not erase the answer for an unrelated job or an unadvanced candidate',async()=>{
 jest.mocked(callResearchApi).mockResolvedValue({...status,selection:'candidates'});
 await expect(continueCandidateResearch(input)).rejects.toThrow('preserve its job');
 expect(db.execute).toHaveBeenCalledTimes(2);
});
it('does not treat a lost transition token as permission to overwrite newer work',async()=>{
 jest.mocked(db.execute).mockResolvedValueOnce([{job_id:jobId}] as never).mockResolvedValueOnce([] as never);
 expect(await continueCandidateResearch(input)).toEqual({pending:true});
});
