/** @jest-environment node */
import {drizzle} from 'drizzle-orm/pglite';
import {queueDirectoryDiscovery} from '../queueDirectoryDiscovery';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client=new PGlite();const database=drizzle(client);
const artist='00000000-0000-4000-8000-000000000001';const actor='00000000-0000-4000-8000-000000000002';
beforeAll(async()=>{await client.exec(`create table artists(id uuid primary key);create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid references artists(id),actor_user_id uuid,actor_kind text,action text,trigger text);create table artist_research_jobs(artist_id uuid references artists(id),kind text,status text,activity_id uuid references artist_activity_events(id),state jsonb);create unique index one_live on artist_research_jobs(artist_id,kind) where status='pending';`)});
afterAll(()=>client.close());
it('commits creation, actor lineage and one bounded pending job together; a failed transaction leaves none',async()=>{
 await expect(database.transaction(async tx=>{await tx.execute((await import('drizzle-orm')).sql`insert into artists values(${artist}::uuid)`);await queueDirectoryDiscovery(tx as never,artist,actor);throw new Error('rollback fixture')})).rejects.toThrow('rollback fixture');
 expect((await client.query('select * from artists')).rows).toHaveLength(0);
 expect((await client.query('select * from artist_activity_events')).rows).toHaveLength(0);
 expect((await client.query('select * from artist_research_jobs')).rows).toHaveLength(0);
 await database.transaction(async tx=>{await tx.execute((await import('drizzle-orm')).sql`insert into artists values(${artist}::uuid)`);await queueDirectoryDiscovery(tx as never,artist,actor)});
 const {rows}=await client.query('select e.actor_user_id,e.trigger,j.state,j.kind from artist_research_jobs j join artist_activity_events e on e.id=j.activity_id');
 expect(rows).toMatchObject([{actor_user_id:actor,trigger:'directory_add',kind:'source_search',state:{claimId:null,purpose:'directory_preparation'}}]);
});
