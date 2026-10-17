/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
let getPublicArtistAbout: typeof import('../getPublicArtistAbout').getPublicArtistAbout;
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const wrap = (executor: typeof driver): typeof driver => new Proxy(executor, {get(target, prop) { if(prop==='execute') return async (query: Parameters<typeof driver.execute>[0]) => { const result=await target.execute(query); return Array.isArray(result)?result:result.rows; }; if(prop==='transaction') return (cb: (tx: unknown)=>unknown) => target.transaction(async tx=>cb(wrap(tx as unknown as typeof driver))); const value=Reflect.get(target,prop); return typeof value==='function'?value.bind(target):value; }});
const database=wrap(driver);
let getCorrectionAbout: typeof import('../getCorrectionAbout').getCorrectionAbout;
let saveCorrectionAbout: typeof import('../saveCorrectionAbout').saveCorrectionAbout;
const report='00000000-0000-4000-8000-000000000004';
const admin='00000000-0000-4000-8000-000000000005';
const artist = '00000000-0000-4000-8000-000000000001';
const source = '00000000-0000-4000-8000-000000000002';
const activity = '00000000-0000-4000-8000-000000000003';
const snapshot = {id:source,artistId:artist,url:'https://artist.example/bio',title:'Bio',extractedText:'Exact artist source',status:'pending'};
const publicAbout = {version:1,bio:'The artist makes music.',kind:'researched',identity:{name:'Example',accounts:{}},sources:[{id:source,url:snapshot.url,label:'Bio'}]};
beforeAll(async () => {
 jest.resetModules();
 ({ getPublicArtistAbout } = await import('../getPublicArtistAbout'));
 ({getCorrectionAbout}=await import('../getCorrectionAbout'));
 ({saveCorrectionAbout}=await import('../saveCorrectionAbout')); 
 await client.exec(`create table artists(id uuid primary key,bio text,name text default 'Example',spotify text);
 create table users(id uuid,is_admin boolean);
 create table artist_bio_corrections(id uuid,artist_id uuid,status text,reviewed_at timestamptz,reviewed_by uuid);
 create table artist_claims(id uuid,artist_id uuid,status text);
 create table artist_bio_versions(id uuid default gen_random_uuid(),artist_id uuid,bio_text text,is_pinned boolean default false);
 create table artist_activity_events(id uuid default gen_random_uuid(),artist_id uuid,trigger text,action text,actor_kind text,actor_user_id uuid,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
 create table artist_research_jobs(id uuid,artist_id uuid,activity_id uuid);
 create table artist_vault_sources(id uuid,artist_id uuid,status text,file_path text,snapshot jsonb);
 create function knowledge_vault_source_snapshot(v artist_vault_sources) returns jsonb language sql as 'select v.snapshot';
 create table artist_source_assessments(source_id uuid,artist_id uuid,activity_id uuid,snapshot jsonb);
 create table artist_directory_preparations(artist_id uuid,activity_id uuid,job_id uuid,status text,starting_bio text,manifest jsonb,public_about jsonb,updated_at timestamptz default now());`);
});
beforeEach(async () => {
 await client.exec('truncate users,artist_bio_corrections,artists,artist_claims,artist_bio_versions,artist_activity_events,artist_research_jobs,artist_vault_sources,artist_source_assessments,artist_directory_preparations');
 await client.query('insert into users values($1,true)',[admin]);
 await client.query("insert into artist_bio_corrections values($1,$2,'pending',null,null)",[report,artist]);
 await client.query('insert into artists(id,bio) values($1,null)',[artist]);
 await client.query("insert into artist_activity_events(id,artist_id,trigger) values($1,$2,'directory_add')",[activity,artist]);
 await client.query('insert into artist_research_jobs values($1,$2,$1)',[activity,artist]);
 await client.query("insert into artist_vault_sources values($1,$2,'pending',null,$3)",[source,artist,JSON.stringify(snapshot)]);
 await client.query('insert into artist_source_assessments values($1,$2,$3,$4)',[source,artist,activity,JSON.stringify(snapshot)]);
 await client.query("insert into artist_directory_preparations(artist_id,activity_id,job_id,status,starting_bio,manifest,public_about) values($1,$2,$2,'ready',null,$3,$4)",[artist,activity,JSON.stringify([snapshot]),JSON.stringify(publicAbout)]);
});
afterAll(() => client.close());

it('edits public directory About, preserves private artist bio and citations, saves history and resolves together',async()=>{
 const before=await getCorrectionAbout(report);
 await saveCorrectionAbout(report,admin,'Corrected public About.',before.revision);
 expect(await getPublicArtistAbout(artist)).toEqual({bio:'Corrected public About.',kind:'researched',sources:publicAbout.sources});
 expect((await client.query('select bio from artists')).rows).toEqual([{bio:null}]);
 expect((await client.query('select bio_text from artist_bio_versions')).rows).toEqual([{bio_text:publicAbout.bio},{bio_text:'Corrected public About.'}]);
 expect((await client.query('select status,reviewed_by from artist_bio_corrections')).rows).toEqual([{status:'resolved',reviewed_by:admin}]);
});
it('rejects stale and non-admin writes without resolving',async()=>{
 const before=await getCorrectionAbout(report);
 await expect(saveCorrectionAbout(report,artist,'Changed.',before.revision)).rejects.toThrow();
 await client.exec("update artist_directory_preparations set public_about=jsonb_set(public_about,'{bio}','\"Someone else edited this.\"')");
 await expect(saveCorrectionAbout(report,admin,'Changed.',before.revision)).rejects.toThrow('changed');
 expect((await client.query('select status from artist_bio_corrections')).rows).toEqual([{status:'pending'}]);
});
it('rolls back the About and history if report resolution fails',async()=>{
 const before=await getCorrectionAbout(report);
 await client.exec("alter table artist_bio_corrections add constraint simulate_failure check (status='pending')");
 try {
  await expect(saveCorrectionAbout(report,admin,'Changed.',before.revision)).rejects.toThrow();
  expect((await getPublicArtistAbout(artist))?.bio).toBe(publicAbout.bio);
  expect((await client.query('select * from artist_bio_versions')).rows).toHaveLength(0);
 } finally {await client.exec('alter table artist_bio_corrections drop constraint simulate_failure');}
});
it('edits a claimed bio but refuses a later pin',async()=>{
 await client.query("insert into artist_claims values($1,$2,'approved')",[admin,artist]);
 await client.query('update artists set bio=$1',[publicAbout.bio]);
 const before=await getCorrectionAbout(report);
 await client.query('insert into artist_bio_versions(artist_id,bio_text,is_pinned) values($1,$2,true)',[artist,publicAbout.bio]);
 await expect(saveCorrectionAbout(report,admin,'Changed.',before.revision)).rejects.toThrow();
 await client.exec('delete from artist_bio_versions');
 await saveCorrectionAbout(report,admin,'Changed.',before.revision);
 expect((await client.query('select bio from artists')).rows).toEqual([{bio:'Changed.'}]);
});
