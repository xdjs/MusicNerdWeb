/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
let getPublicArtistAbout: typeof import('../getPublicArtistAbout').getPublicArtistAbout;
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const database = { execute: async (query: Parameters<typeof driver.execute>[0]) => await driver.execute(query).then(result => Array.isArray(result) ? result : result.rows) };
const artist = '00000000-0000-4000-8000-000000000001';
const source = '00000000-0000-4000-8000-000000000002';
const activity = '00000000-0000-4000-8000-000000000003';
const snapshot = {id:source,artistId:artist,url:'https://artist.example/bio',title:'Bio',extractedText:'Exact artist source',status:'pending'};
const publicAbout = {version:1,bio:'The artist makes music.',kind:'researched',identity:{name:'Example',accounts:{}},sources:[{id:source,url:snapshot.url,label:'Bio'}]};
beforeAll(async () => {
 jest.resetModules();
 ({ getPublicArtistAbout } = await import('../getPublicArtistAbout')); 
 await client.exec(`create table artists(id uuid primary key,bio text,name text default 'Example',spotify text);
 create table artist_claims(artist_id uuid,status text);
 create table artist_bio_versions(artist_id uuid,is_pinned boolean);
 create table artist_activity_events(id uuid,artist_id uuid,trigger text);
 create table artist_research_jobs(id uuid,artist_id uuid,activity_id uuid);
 create table artist_vault_sources(id uuid,artist_id uuid,status text,file_path text,snapshot jsonb);
 create function knowledge_vault_source_snapshot(v artist_vault_sources) returns jsonb language sql as 'select v.snapshot';
 create table artist_source_assessments(source_id uuid,artist_id uuid,activity_id uuid,snapshot jsonb);
 create table artist_directory_preparations(artist_id uuid,activity_id uuid,job_id uuid,status text,starting_bio text,manifest jsonb,public_about jsonb);`);
});
beforeEach(async () => {
 await client.exec('truncate artists,artist_claims,artist_bio_versions,artist_activity_events,artist_research_jobs,artist_vault_sources,artist_source_assessments,artist_directory_preparations');
 await client.query('insert into artists(id,bio) values($1,null)',[artist]);
 await client.query("insert into artist_activity_events values($1,$2,'directory_add')",[activity,artist]);
 await client.query('insert into artist_research_jobs values($1,$2,$1)',[activity,artist]);
 await client.query("insert into artist_vault_sources values($1,$2,'pending',null,$3)",[source,artist,JSON.stringify(snapshot)]);
 await client.query('insert into artist_source_assessments values($1,$2,$3,$4)',[source,artist,activity,JSON.stringify(snapshot)]);
 await client.query("insert into artist_directory_preparations values($1,$2,$2,'ready',null,$3,$4)",[artist,activity,JSON.stringify([snapshot]),JSON.stringify(publicAbout)]);
});
afterAll(() => client.close());
it('returns only separately prepared public prose and safe citations',async()=>{
 expect(await getPublicArtistAbout(artist)).toEqual({bio:publicAbout.bio,kind:'researched',sources:publicAbout.sources});
});
it.each([
 "update artist_vault_sources set status='rejected'",
 "update artist_vault_sources set snapshot=jsonb_set(snapshot,'{extractedText}','\"Different artist\"')",
 'delete from artist_vault_sources', 'delete from artist_source_assessments',
 "update artist_source_assessments set snapshot='{}'",
 "update artists set name='Different identity'",
 "update artists set spotify='new-id'",
 "update artists set bio='An artist edit'",
 "insert into artist_bio_versions select id,true from artists",
 "insert into artist_claims select id,'pending' from artists",
 "insert into artist_claims select id,'approved' from artists",
 "insert into artist_claims select id,'rejected' from artists",
 "update artist_activity_events set trigger='manual'",
 "update artist_directory_preparations set public_about=null",
 "update artist_directory_preparations set manifest='[]'"
])('withdraws public About when eligibility changes: %s',async sql=>{
 await client.exec(sql); expect(await getPublicArtistAbout(artist)).toBeNull();
});
it('allows pending to approved curation without exposing the private original',async()=>{
 await client.exec("update artist_vault_sources set status='approved'");
 expect(await getPublicArtistAbout(artist)).not.toBeNull();
});

it.each([
 "update artist_vault_sources set file_path='private/interview.txt'",
 "update artist_vault_sources set artist_id='00000000-0000-4000-8000-000000000099'",
 "update artist_source_assessments set activity_id='00000000-0000-4000-8000-000000000099'",
 "update artist_research_jobs set activity_id='00000000-0000-4000-8000-000000000099'",
 "update artist_directory_preparations set public_about=jsonb_set(public_about,'{sources,0,url}','\"https://unassessed.example/bio\"')",
 "update artist_directory_preparations set public_about=jsonb_set(public_about,'{sources,0,id}','\"00000000-0000-4000-8000-000000000099\"')"
])('rejects private, unrelated or no-longer-assessed source lineage: %s', async mutation => {
 await client.exec(mutation);
 expect(await getPublicArtistAbout(artist)).toBeNull();
});
it('checks official ownership against the current identity, not just a public URL', async () => {
 await client.query('update artists set spotify=$1', ['current-artist']);
 const official = { ...publicAbout, kind: 'official', identity: { name: 'Example', accounts: { spotify: 'current-artist' } }, ownership: { siteName: 'spotify', id: 'current-artist' } };
 await client.query('update artist_directory_preparations set public_about=$1', [JSON.stringify(official)]);
 expect(await getPublicArtistAbout(artist)).toMatchObject({ kind: 'official' });
 await client.query('update artist_directory_preparations set public_about=$1', [JSON.stringify({ ...official, ownership: { siteName: 'spotify', id: 'namesake' } })]);
 expect(await getPublicArtistAbout(artist)).toBeNull();
});
