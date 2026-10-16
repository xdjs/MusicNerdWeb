/** @jest-environment node */
import { callResearchApi } from '../callResearchApi';
jest.mock('@/env',()=>({MUSICNERD_RESEARCH_API_KEY:'s'.repeat(32)}));
jest.mock('@/lib/musicNerdApi/const',()=>({MUSICNERD_API_URL:'https://api.example.test'}));
afterEach(()=>jest.restoreAllMocks());
function reply(body:unknown) {const read=jest.fn().mockResolvedValueOnce({done:false,value:Buffer.from(JSON.stringify(body))}).mockResolvedValue({done:true});return {ok:false,status:429,body:{getReader:()=>({read,cancel:async()=>{},releaseLock:()=>{}})}}; }
it('preserves bounded quota timing without exposing upstream error details',async()=>{
 const resetAt='2026-10-16T01:00:00.000Z';
 global.fetch=jest.fn().mockResolvedValue(reply({code:'saved_evidence_quota',error:'private',retryAfterSeconds:120,resetAt}));
 await expect(callResearchApi('/api/artist/11111111-1111-4111-8111-111111111111/research/questions')).rejects.toMatchObject({status:429,code:'saved_evidence_quota',retryAfterSeconds:120,resetAt});
});
it('drops malformed reset metadata and unknown error codes',async()=>{
 global.fetch=jest.fn().mockResolvedValue(reply({code:'secret',retryAfterSeconds:-1,resetAt:'not a date'}));
 try {await callResearchApi('/api/artist/11111111-1111-4111-8111-111111111111/research/questions');throw Error('expected');}catch(error){expect(error).not.toHaveProperty('retryAfterSeconds');expect(error).not.toHaveProperty('resetAt');expect(error).toHaveProperty('code',undefined);}
});
