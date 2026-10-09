/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { getTableColumns } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, { schema });
const database = {
  ...driver,
  execute: async (q: Parameters<typeof driver.execute>[0]) => (await driver.execute(q)).rows,
  transaction: (fn: (tx: unknown) => Promise<unknown>) => driver.transaction(tx => fn({
    ...tx, query: tx.query, insert: tx.insert.bind(tx), update: tx.update.bind(tx),
    execute: async (q: Parameters<typeof tx.execute>[0]) => (await tx.execute(q)).rows,
  })),
};
const artist = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const contributor = '00000000-0000-4000-8000-000000000003';
const claim = '00000000-0000-4000-8000-000000000004';
let list: typeof import('../getArtistLinkSuggestions').getArtistLinkSuggestions;
let decide: typeof import('../reviewArtistLinkSuggestion').reviewArtistLinkSuggestion;
let hidden: typeof import('../getHiddenLinkSourceIds').getHiddenLinkSourceIds;
let add: typeof import('../../queries/insertVaultSource').insertVaultSource;
beforeAll(async () => {
  jest.resetModules();
  ({getArtistLinkSuggestions:list}=await import('../getArtistLinkSuggestions'));
  ({reviewArtistLinkSuggestion:decide}=await import('../reviewArtistLinkSuggestion'));
  ({getHiddenLinkSourceIds:hidden}=await import('../getHiddenLinkSourceIds'));
  ({ insertVaultSource: add } = await import('../../queries/insertVaultSource'));
  await client.exec(`
    CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
    create table artists(${Object.values(getTableColumns(schema.artists)).map(column=>`"${column.name}" ${column.getSQLType()}${column.name==='id'?' primary key':''}`).join(',')});
    create table users(id uuid primary key,is_admin boolean,is_white_listed boolean,username text,wallet text,is_hidden boolean default false);
    create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text,reference_code text,created_at timestamptz,updated_at timestamptz);
    create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
    create type source_status as enum ('pending','approved','rejected');
    create table ugcresearch(id uuid primary key default gen_random_uuid(),artist_id uuid,user_id uuid,ugc_url text,site_name text,site_username text,origin text default 'submission',accepted boolean default false,date_processed timestamp,created_at timestamp default now(),updated_at timestamp default now());
    create table artist_vault_sources(id uuid primary key default gen_random_uuid(),artist_id uuid,status source_status,title text,url text,created_at timestamptz default now(),updated_at timestamptz default now(),snippet text,type text,file_name text,file_size integer,file_path text,content_type text,extracted_text text,og_image text,published_at date,podcast_episode_key text,podcast_show_title text,podcast_episode_title text,origin text,activity_id uuid);
    create unique index sources_unique on artist_vault_sources(artist_id,url);
    create table artist_research_jobs(id uuid primary key default gen_random_uuid(),artist_id uuid,kind text,status text default 'pending' constraint artist_research_jobs_status_check check(status in ('pending','running','done','failed')),cursor integer default 0,total integer,state jsonb,activity_id uuid,claimed_at timestamptz,attempts integer default 0,last_error text,created_at timestamptz default now(),updated_at timestamptz default now());
    create unique index artist_research_jobs_one_live on artist_research_jobs(artist_id,kind) where status in ('pending','running');
    insert into artists(id) values('${artist}');
    insert into users(id,is_admin,is_white_listed,username) values('${admin}',false,false,'Artist'),('${contributor}',false,true,'Listener');
    insert into artist_claims(id,artist_id,user_id,status)values('${claim}','${artist}','${admin}','approved');
  `);
  await client.exec(readFileSync('drizzle/0038_automatic_source_extraction.sql', 'utf8'));
}, 30000);
afterAll(async () => client.close());
beforeEach(async () => {
  await client.query("update users set username='Listener' where id=$1",[contributor]);
 await client.query("update artist_claims set user_id=$1,status='approved'",[admin]);
  await client.exec('truncate artist_vault_sources,artist_research_jobs,artist_activity_events,ugcresearch');
});

const pending = (url='https://music.apple.com/us/artist/example/123') => add({artistId:artist,url,type:'profile',status:'pending'},undefined,{userId:contributor,trigger:'link_submission'});
it('allows owner review, retaining contributor, exact submission/review timestamps and source extraction job',async()=>{
 const source=(await pending())!;
 expect((await list(artist,admin)).items[0]).toMatchObject({suggestedBy:{id:contributor,name:'Listener'},status:'pending',reviewedAt:null});
 await decide(artist,admin,{kind:'source',id:source.id,decision:'approve'});
 const item=(await list(artist,admin)).items[0];
 expect(item).toMatchObject({status:'approved',suggestedBy:{id:contributor,name:'Listener'},reviewedBy:{id:admin,name:'Artist'}});
 expect(item.submittedAt).toMatch(/Z$/);expect(item.reviewedAt).toMatch(/Z$/);
 expect((await client.query('select id from artist_research_jobs')).rows).toHaveLength(1);
});
it('denies another user, revoked claim and wrong artist without writes',async()=>{
 const source=(await pending())!;
 await expect(list(artist,contributor)).rejects.toThrow('ownership changed');
 await expect(decide(artist,contributor,{kind:'source',id:source.id,decision:'approve'})).rejects.toThrow('ownership changed');
 await client.exec("update artist_claims set status='rejected'");
 await expect(decide(artist,admin,{kind:'source',id:source.id,decision:'approve'})).rejects.toThrow('ownership changed');
 expect((await client.query("select status from artist_vault_sources")).rows[0]).toEqual({status:'pending'});
});
it('only one overlapping decision succeeds; removal keeps approved evidence and original contributor',async()=>{
 const source=(await pending())!;
 const result=await Promise.allSettled([decide(artist,admin,{kind:'source',id:source.id,decision:'approve'}),decide(artist,admin,{kind:'source',id:source.id,decision:'dismiss'})]);
 expect(result.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 await decide(artist,admin,{kind:'source',id:source.id,decision:'remove'});
 expect(await hidden(artist)).toContain(source.id);
 expect((await list(artist,admin)).items[0]).toMatchObject({hidden:true,status:'approved',suggestedBy:{id:contributor}});
 await decide(artist,admin,{kind:'source',id:source.id,decision:'restore'});
 expect(await hidden(artist)).not.toContain(source.id);
});
it('rejects account replacement and song links; dismiss retains attribution',async()=>{
 const one=(await pending())!;await decide(artist,admin,{kind:'source',id:one.id,decision:'approve'});
 const two=(await pending('https://music.apple.com/us/artist/another/456'))!;
 await expect(decide(artist,admin,{kind:'source',id:two.id,decision:'approve'})).rejects.toThrow('different account');
 const song=(await pending('https://music.apple.com/us/album/song/789'))!;
 await expect(decide(artist,admin,{kind:'source',id:song.id,decision:'approve'})).rejects.toThrow('not an artist');
 await decide(artist,admin,{kind:'source',id:two.id,decision:'dismiss'});
 expect((await list(artist,admin)).items.find(x=>x.id===two.id)).toMatchObject({status:'rejected',suggestedBy:{id:contributor}});
});
it('projects existing UGC suggestions and never leaks an email-shaped username',async()=>{
 await client.query("insert into ugcresearch(artist_id,user_id,ugc_url,site_name,site_username)values($1,$2,'https://instagram.com/listener','instagram','listener')",[artist,contributor]);
 await client.query("update users set username='private@example.test' where id=$1",[contributor]);
 const result=await list(artist,admin);
 expect(result.items[0]).toMatchObject({kind:'ugc',suggestedBy:{id:contributor,name:'Anonymous'}});
 expect(JSON.stringify(result)).not.toContain('private@');
 await decide(artist,admin,{kind:'ugc',id:result.items[0].id,decision:'dismiss'});
 expect((await list(artist,admin)).items[0]).toMatchObject({status:'rejected',reviewedBy:{id:admin}});
});

it('hides private contributors and paginates through non-link Lore without dropping candidates',async()=>{
 await client.query("update users set is_hidden=true where id=$1",[contributor]);
 await pending();
 const result=await list(artist,admin);
 expect(result.items[0].suggestedBy).toEqual({id:null,name:'Not recorded'});
 await client.query("insert into artist_vault_sources(artist_id,url,type,status,origin,created_at) select $1,'https://example.test/article/'||i,'article','pending','research',now()+interval '1 hour' from generate_series(1,101)i",[artist]);
 const first=await list(artist,admin);
 expect(first).toMatchObject({items:[],hasMore:true,nextOffset:100});
 const second=await list(artist,admin,first.nextOffset!);
 expect(second.items).toHaveLength(1);expect(second.hasMore).toBe(false);
});

it('approves a legacy UGC link via the shared writer and rejects another artist item',async()=>{
 await client.query("insert into ugcresearch(artist_id,user_id,ugc_url,site_name,site_username)values($1,$2,'https://instagram.com/listener','instagram','listener')",[artist,contributor]);
 const item=(await list(artist,admin)).items[0];
 await decide(artist,admin,{kind:'ugc',id:item.id,decision:'approve'});
 expect((await client.query('select instagram from artists where id=$1',[artist])).rows[0]).toEqual({instagram:'listener'});
 expect((await list(artist,admin)).items[0]).toMatchObject({status:'approved',reviewedBy:{id:admin}});
 const other='00000000-0000-4000-8000-000000000099';
 await client.query('insert into artists(id)values($1)',[other]);
 await client.query('update ugcresearch set artist_id=$1,accepted=false,date_processed=null',[other]);
 await expect(decide(artist,admin,{kind:'ugc',id:item.id,decision:'approve'})).rejects.toThrow('no longer available');
});

it('converts legacy Apple Music UGC into attributed source-backed link atomically',async()=>{
 await client.query("update users set is_hidden=false where id=$1",[contributor]);
 await client.query("insert into ugcresearch(artist_id,user_id,ugc_url,site_name,site_username)values($1,$2,'https://music.apple.com/us/artist/example/123','applemusic','123')",[artist,contributor]);
 const item=(await list(artist,admin)).items[0];
 await decide(artist,admin,{kind:'ugc',id:item.id,decision:'approve'});
 const source=(await list(artist,admin)).items.find(x=>x.kind==='source');
 expect(source).toMatchObject({status:'approved',suggestedBy:{id:contributor,name:'Listener'},reviewedBy:{id:admin,name:'Artist'}});
 expect(source?.submittedAt).toEqual(item.submittedAt);
});
it('new source-backed Add Link submission enters artist review and owner direct add can restore a hidden link',async()=>{
 const {submitArtistDestination}=await import('../submitArtistDestination');
 const result=await submitArtistDestination(artist,contributor,'https://www.beatport.com/artist/example/123');
 expect((await list(artist,admin)).items[0]).toMatchObject({id:result.id,status:'pending',origin:'submission'});
 await submitArtistDestination(artist,admin,'https://www.beatport.com/artist/example/123',true);
 await decide(artist,admin,{kind:'source',id:result.id,decision:'remove'});
 await submitArtistDestination(artist,admin,'https://www.beatport.com/artist/example/123',true);
 expect(await hidden(artist)).toEqual([]);
 await expect(submitArtistDestination(artist,contributor,'https://music.apple.com/us/album/song/123')).rejects.toThrow('not a song');
});
