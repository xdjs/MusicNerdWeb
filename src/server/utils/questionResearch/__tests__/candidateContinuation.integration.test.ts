/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { getResearchQuestionHash } from '@/lib/questionResearch/getResearchQuestionHash';
let advance: typeof import('../continueCandidateResearch').continueCandidateResearch;
const callApi=jest.fn();
jest.mock('../callResearchApi',()=>({callResearchApi:(...args:unknown[])=>callApi(...args)}));
jest.mock('@/server/db/drizzle',()=>({get db(){return database;}}));
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client=new PGlite();
const driver=drizzle(client);
const database={execute:async(query:Parameters<typeof driver.execute>[0])=>(await driver.execute(query)).rows};
const artistId='11111111-1111-4111-8111-111111111111',jobId='22222222-2222-4222-8222-222222222222';
const question='Who played bass?',questionHash=getResearchQuestionHash(question);
const input={artistId,jobId,question};
const state={status:'ok',jobId,selection:'research',stage:'checking_saved',provider:null,message:'Checking Lore',updatedAt:'2026-10-15',references:[],limitations:[]};
beforeAll(async()=>{
 jest.resetModules();
 ({continueCandidateResearch:advance}=await import('../continueCandidateResearch'));
 await client.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key);create table artist_research_jobs(id uuid primary key);insert into artists values('${artistId}');insert into artist_research_jobs values('${jobId}');`);
 await client.exec(readFileSync('drizzle/0044_question_answer_replay.sql','utf8'));
},30000);
beforeEach(async()=>{
 callApi.mockReset().mockResolvedValue(state);
 await client.exec('reset role;delete from artist_question_answers;set role mnweb');
 await client.query(`insert into artist_question_answers(job_id,artist_id,question_hash,status,claim_token,claim_until,attempts,result,expires_at) values($1,$2,$3,'verified',gen_random_uuid(),now(),1,'{"sources":[],"answer":"Not enough"}',now()+interval '10 minutes')`,[jobId,artistId,questionHash]);
});
afterAll(async()=>{await client.close();});
it('continues once under concurrent requests without resetting attempts or expiry',async()=>{
 const before=(await client.query('select attempts,expires_at from artist_question_answers')).rows;
 let finish!:(value:unknown)=>void;
 callApi.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const first=advance(input);
 for(let n=0;n<30&&!finish;n++)await new Promise(resolve=>setTimeout(resolve,5));
 expect(finish).toBeDefined();expect(await advance(input)).toEqual({pending:true});
 finish(state);expect(await first).toMatchObject({jobId,selection:'research'});
 expect(callApi).toHaveBeenCalledTimes(1);
 expect((await client.query('select attempts,expires_at from artist_question_answers')).rows).toEqual(before);
 expect((await client.query('select status,result,failure_stage from artist_question_answers')).rows).toEqual([{status:'waiting',result:null,failure_stage:null}]);
});
it('retries an uncertain API outcome using the same recoverable marker',async()=>{
 callApi.mockRejectedValueOnce(new Error('Network response lost'));
 await expect(advance(input)).rejects.toThrow('Network response lost');
 expect((await client.query('select status,failure_stage,attempts from artist_question_answers')).rows).toEqual([{status:'verified',failure_stage:'candidate_continuation',attempts:1}]);
 expect(await advance(input)).toMatchObject({jobId});expect(callApi).toHaveBeenCalledTimes(2);
});
it.each(['drafting','failed'])('does not overwrite a %s answer or its token',async(status)=>{
 await client.query('update artist_question_answers set status=$1,result=null',[status]);
 expect(await advance(input)).toEqual({pending:true});expect(callApi).not.toHaveBeenCalled();
});
it('cannot erase a sourced answer, an expired registration or another question',async()=>{
 await client.exec(`update artist_question_answers set result='{"sources":[{"n":1}]}'`);
 expect(await advance(input)).toEqual({pending:true});
 await client.exec(`update artist_question_answers set result='{"sources":[]}',expires_at=now()-interval '1 second'`);
 expect(await advance(input)).toEqual({pending:true});
 expect(await advance({...input,question:'A different question'})).toEqual({pending:true});
 expect(callApi).not.toHaveBeenCalled();
});
