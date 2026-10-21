/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
let cancelThumbnailTestJob: typeof import('../cancelThumbnailTestJob').cancelThumbnailTestJob;
jest.mock('@/server/db/drizzle',()=>({get db(){return database;}}));
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client=new PGlite(); const driver=drizzle(client);
const database={transaction:(fn:(tx:unknown)=>Promise<unknown>)=>driver.transaction(tx=>fn({execute:async(q:Parameters<typeof tx.execute>[0])=>(await tx.execute(q)).rows}))};
const artist='50f23458-df64-4381-8042-7333e8b64531',job='e7a054cc-93a3-4d1d-921e-c2ff3ad119bc';
const source='00000000-0000-4000-8000-000000000001',claim='00000000-0000-4000-8000-000000000002',user='00000000-0000-4000-8000-000000000003';
const url='https://peterango.com/projects/dead-set-fc'; const original={...process.env};
beforeAll(async()=>{jest.resetModules(); ({cancelThumbnailTestJob}=await import('../cancelThumbnailTestJob')); await client.exec(`create table artists(id uuid primary key);create table artist_claims(id uuid,artist_id uuid,user_id uuid,status text);create table artist_vault_sources(id uuid,artist_id uuid,url text);create table artist_research_jobs(id uuid primary key,artist_id uuid,kind text,status text,cursor int,total int,state jsonb,claimed_at timestamptz,last_error text,updated_at timestamptz);`);},30000);
beforeEach(async()=>{
 process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='codex/1583-suggestion-routing';process.env.MN_THUMBNAIL_TEST_SCOPE=JSON.stringify({artistId:artist,url,expiresAt:Date.now()+60000});
 await client.exec(`delete from artist_research_jobs;delete from artist_vault_sources;delete from artist_claims;delete from artists;insert into artists values('${artist}');insert into artist_claims values('${claim}','${artist}','${user}','approved');`);
 await client.query(`insert into artist_research_jobs values($1,$2,'source_extract','pending',0,1,$3,null,null,now())`,[job,artist,JSON.stringify({version:2,autoSourceId:source,expectedClaimId:claim,sources:[{id:source,url}],outcomes:[]})]);
});
afterEach(()=>{process.env={...original};});afterAll(async()=>client.close());
test('cancels only exact deleted source job, preserving state; retry is idempotent',async()=>{
 const before=(await client.query('select state from artist_research_jobs')).rows;
 await client.exec(`insert into artist_research_jobs select '00000000-0000-4000-8000-000000000004',artist_id,kind,status,cursor,total,state,claimed_at,last_error,updated_at from artist_research_jobs`);
 expect(await cancelThumbnailTestJob(user)).toEqual({jobId:job,sourceId:source,status:'cancelled'});
 expect(await cancelThumbnailTestJob(user)).toEqual({jobId:job,sourceId:source,status:'already_cancelled'});
 expect((await client.query('select state from artist_research_jobs where id=$1',[job])).rows).toEqual(before);
 expect((await client.query('select status from artist_research_jobs where id<>$1',[job])).rows).toEqual([{status:'pending'}]);
});
test.each(["status='running'","kind='lore_refresh'","cursor=1","total=2","state=jsonb_set(state,'{sources,0,url}','\"https://other.test\"')","state=jsonb_set(state,'{autoSourceId}','\"00000000-0000-4000-8000-000000000009\"')","state=jsonb_set(state,'{expectedClaimId}','null')"] )('refuses mismatch %s',async(change)=>{await client.exec(`update artist_research_jobs set ${change}`);const before=(await client.query('select * from artist_research_jobs')).rows; await expect(cancelThumbnailTestJob(user)).rejects.toThrow(/Refusing running|identity or progress|binding changed|Invalid literal value|Expected string, received null/); expect((await client.query('select * from artist_research_jobs')).rows).toEqual(before);});
test('refuses source still present',async()=>{await client.exec(`insert into artist_vault_sources values('${source}','${artist}','${url}')`);await expect(cancelThumbnailTestJob(user)).rejects.toThrow('Test source still exists');});
test('refuses nonowner',async()=>{await expect(cancelThumbnailTestJob(source)).rejects.toThrow('Current approved owner required');});
test('refuses production',async()=>{process.env.VERCEL_ENV='production';await expect(cancelThumbnailTestJob(user)).rejects.toThrow('Preview cleanup scope unavailable');});
