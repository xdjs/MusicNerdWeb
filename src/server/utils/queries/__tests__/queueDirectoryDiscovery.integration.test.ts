/** @jest-environment node */
import {drizzle} from 'drizzle-orm/pglite';
import {queueDirectoryDiscovery} from '../queueDirectoryDiscovery';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client=new PGlite();const database=drizzle(client);
const artist='00000000-0000-4000-8000-000000000001';const actor='00000000-0000-4000-8000-000000000002';
beforeAll(async()=>{await client.exec(`create table artists(id uuid primary key,name text,deezer text,spotify text);create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid references artists(id),actor_user_id uuid,actor_kind text,action text,trigger text);create table artist_research_jobs(id uuid default gen_random_uuid(),artist_id uuid references artists(id),kind text,status text,activity_id uuid references artist_activity_events(id),state jsonb);create unique index one_live on artist_research_jobs(artist_id,kind) where status='pending';`)});
afterAll(()=>client.close());
it('commits creation, actor lineage and one bounded pending job together; a failed transaction leaves none',async()=>{
 await expect(database.transaction(async tx=>{await tx.execute((await import('drizzle-orm')).sql`insert into artists(id) values(${artist}::uuid)`);await queueDirectoryDiscovery(tx as never,artist,actor);throw new Error('rollback fixture')})).rejects.toThrow('rollback fixture');
 expect((await client.query('select * from artists')).rows).toHaveLength(0);
 expect((await client.query('select * from artist_activity_events')).rows).toHaveLength(0);
 expect((await client.query('select * from artist_research_jobs')).rows).toHaveLength(0);
 await database.transaction(async tx=>{await tx.execute((await import('drizzle-orm')).sql`insert into artists(id) values(${artist}::uuid)`);await queueDirectoryDiscovery(tx as never,artist,actor)});
 const {rows}=await client.query('select e.actor_user_id,e.trigger,j.state,j.kind from artist_research_jobs j join artist_activity_events e on e.id=j.activity_id');
 expect(rows).toMatchObject([{actor_user_id:actor,trigger:'directory_add',kind:'source_search',state:{claimId:null,purpose:'directory_preparation'}}]);
});

it('queues independent Spotify matching only for a Deezer-only new artist, with the same actor lineage',async()=>{
 const second='00000000-0000-4000-8000-000000000003';
 await client.query('insert into artists(id,name,deezer) values($1,$2,$3)',[second,'The Ellis Court','258229712']);
 await database.transaction(tx=>queueDirectoryDiscovery(tx as never,second,actor));
 const {rows}=await client.query('select kind,activity_id,state from artist_research_jobs where artist_id=$1 order by kind',[second]);
 expect(rows).toHaveLength(2);
 expect(rows[0]).toMatchObject({kind:'source_search'});
 expect(rows[1]).toMatchObject({kind:'spotify_match',activity_id:(rows[0] as any).activity_id,state:{version:1,purpose:'spotify_identity',deezerId:'258229712',artistName:'The Ellis Court',creationActivityId:(rows[0] as any).activity_id,directoryActivityId:(rows[0] as any).activity_id}});
 expect((rows[1] as any).state.expiresAtMs).toBeGreaterThan(Date.now());
});
it('does not queue matching when Spotify is already verified',async()=>{
 const third='00000000-0000-4000-8000-000000000004';
 await client.query('insert into artists(id,name,deezer,spotify) values($1,$2,$3,$4)',[third,'Both','12','known-spotify']);
 await database.transaction(tx=>queueDirectoryDiscovery(tx as never,third,actor));
 expect((await client.query('select kind from artist_research_jobs where artist_id=$1',[third])).rows).toEqual([{kind:'source_search'}]);
});

it('uses the database-scheduled counterpart job without duplicating legacy matching and attaches creation lineage',async()=>{
 const fourth='00000000-0000-4000-8000-000000000005';
 await client.query('insert into artists(id,name,deezer) values($1,$2,$3)',[fourth,'New scheduler','42']);
 await client.query("insert into artist_research_jobs(artist_id,kind,status,state) values($1,'catalog_match','pending','{}')",[fourth]);
 await database.transaction(tx=>queueDirectoryDiscovery(tx as never,fourth,actor));
 const {rows}=await client.query('select kind,activity_id from artist_research_jobs where artist_id=$1 order by kind',[fourth]);
 expect(rows).toHaveLength(2);expect(rows[0]).toMatchObject({kind:'catalog_match',activity_id:(rows[1] as any).activity_id});expect(rows[1]).toMatchObject({kind:'source_search'});expect((rows[0] as any).activity_id).toBeTruthy();
});
