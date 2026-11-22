/** @jest-environment node */
import {readFileSync} from 'node:fs';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');

const migration=readFileSync('drizzle/0068_drop_legacy_agent_tables.sql','utf8');
const legacy=['mcp_api_keys','mcp_audit_log','agent_heartbeats','agent_runs'];

async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role mnweb;create table artists(id uuid primary key);
 create table mcp_api_keys(id uuid primary key,key_hash text not null unique);
 create table mcp_audit_log(id uuid primary key,artist_id uuid not null references artists(id),api_key_hash text not null);
 create index idx_mcp_audit_log_artist_id on mcp_audit_log(artist_id);
 create table agent_heartbeats(id uuid primary key,worker_id text not null unique);
 create table agent_runs(id uuid primary key,worker_id text not null);
 alter table agent_runs enable row level security;
 create policy mnweb_select_agent_runs on agent_runs for select to mnweb using (true);`);
 return pg;
}
const remaining=async(pg:InstanceType<typeof PGlite>)=>(await pg.query<{name:string}>(
 `select relname as name from pg_class where relname = any($1) order by relname`,[legacy])).rows.map(r=>r.name);

it('drops the four legacy tables with their indexes and policies, keeping artists',async()=>{
 const pg=await setup();try{
  await pg.exec(migration);
  expect(await remaining(pg)).toEqual([]);
  expect((await pg.query(`select 1 from pg_policies where tablename = any($1)`,[legacy])).rows).toEqual([]);
  expect((await pg.query(`select to_regclass('artists') as t`)).rows).toEqual([{t:'artists'}]);
 }finally{await pg.close();}
},30000);

it('fails and drops nothing when another object depends on a legacy table',async()=>{
 const pg=await setup();try{
  await pg.exec(`create view recent_audit as select * from mcp_audit_log`);
  await expect(pg.exec(migration)).rejects.toThrow(/depend/);
  await pg.exec('rollback');
  expect(await remaining(pg)).toEqual([...legacy].sort());
 }finally{await pg.close();}
},30000);
