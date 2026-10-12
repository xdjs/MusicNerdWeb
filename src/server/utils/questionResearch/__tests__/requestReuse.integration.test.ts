/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
let acquire: typeof import('../acquireQuestionRequest').acquireQuestionRequest;
let bind: typeof import('../bindQuestionRequest').bindQuestionRequest;
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const database = {
 execute: async (query: Parameters<typeof driver.execute>[0]) => (await driver.execute(query)).rows,
 transaction: (fn: (tx: unknown) => Promise<unknown>) => driver.transaction(tx => fn({execute: async (query: Parameters<typeof tx.execute>[0]) => (await tx.execute(query)).rows})),
};
const artist = '11111111-1111-4111-8111-111111111111';
const job = '22222222-2222-4222-8222-222222222222';
const key = 'a'.repeat(64);
beforeAll(async () => {
 jest.resetModules();
 ({ acquireQuestionRequest: acquire } = await import('../acquireQuestionRequest'));
 ({ bindQuestionRequest: bind } = await import('../bindQuestionRequest'));
 await client.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key);create table artist_research_jobs(id uuid primary key);insert into artists values('${artist}');insert into artist_research_jobs values('${job}');`);
 await client.exec(readFileSync('drizzle/0046_question_request_reuse.sql','utf8'));
},30000);
beforeEach(async()=>{await client.exec('reset role;delete from artist_question_requests;set role mnweb');});
afterAll(async()=>{await client.close();});
it('allows exactly one of concurrent initial planners and stores no visitor content', async()=>{
 const results=await Promise.all([acquire(artist,key),acquire(artist,key)]);
 expect(results.map(r=>r.state).sort()).toEqual(['busy','claimed']);
 const rows=(await client.query<Record<string,unknown>>('select * from artist_question_requests')).rows;
 expect(rows).toHaveLength(1);
 expect(Object.keys(rows[0]).sort()).toEqual(['answer_intent','artist_id','expires_at','job_id','lease_until','question_hash','request_hash','reusable','routing','token']);
});
it('binds once, returns its mapping, and only one invalidator wins',async()=>{
 const lease=await acquire(artist,key);if(lease.state!=='claimed') throw Error('lease');
 await bind({artistId:artist,requestHash:key,token:lease.token,jobId:job,question:'Who played drums?',reusable:true});
 const found=await acquire(artist,key);
 expect(found).toMatchObject({state:'bound',binding:{job_id:job,reusable:true}});
 const results=await Promise.all([acquire(artist,key,lease.token),acquire(artist,key,lease.token)]);
 expect(results.map(r=>r.state).sort()).toEqual(['busy','claimed']);
 await expect(bind({artistId:artist,requestHash:key,token:lease.token,jobId:job,question:'late',reusable:true})).rejects.toThrow('expired');
});
it('reclaims expired leases without allowing their late completion',async()=>{
 const first=await acquire(artist,key);if(first.state!=='claimed') throw Error('lease');
 await client.exec("update artist_question_requests set lease_until=now()-interval '1 second'");
 const next=await acquire(artist,key);expect(next.state).toBe('claimed');
 await expect(bind({artistId:artist,requestHash:key,token:first.token,jobId:job,question:'old',reusable:true})).rejects.toThrow('expired');
});
it('bounds unique-request abuse while allowing existing lookup at the ceiling',async()=>{
 for(let n=0;n<10;n++) await acquire(artist,n.toString(16).padStart(64,'0'));
 await expect(acquire(artist,key)).rejects.toMatchObject({code:'question_planning_quota'});
 expect((await acquire(artist,'0'.repeat(64))).state).toBe('busy');
});
it('denies browser roles access and exposes RLS as enabled',async()=>{
 await client.exec('reset role;set role anon');
 await expect(client.query<Record<string,unknown>>('select * from artist_question_requests')).rejects.toThrow('permission denied');
 await client.exec('reset role;set role authenticated');
 await expect(client.query('insert into artist_question_requests(artist_id) values($1)',[artist])).rejects.toThrow('permission denied');
 await client.exec('reset role');
 expect((await client.query("select relrowsecurity from pg_class where relname='artist_question_requests'")).rows).toEqual([{relrowsecurity:true}]);
});
