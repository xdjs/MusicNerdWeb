/** @jest-environment node */
import {readFileSync} from 'node:fs';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const artist='00000000-0000-4000-8000-000000000001',claim='00000000-0000-4000-8000-000000000002';
async function setup(){
 const pg=new PGlite();
 await pg.exec(`create role mnweb;create role anon;create role authenticated;create schema mn_private;grant usage on schema mn_private to mnweb;
 create table artists(id uuid primary key,bio text);create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text);
 create table artist_vault_sources(artist_id uuid,status text,publication text);create table mn_private.artist_bio_provenance(artist_id uuid,provenance jsonb);
 insert into artists values('${artist}','original');insert into artist_claims values('${claim}','${artist}','${artist}','approved');
 insert into artist_vault_sources values('${artist}','approved','inherit');`);
 await pg.exec(readFileSync('drizzle/0063_legacy_bio_publications.sql','utf8'));
 return pg;
}
const seed=`insert into mn_private.legacy_bio_publications values('${artist}','${claim}','${'a'.repeat(64)}')`;
it.each([
 "update artists set bio='changed';update artists set bio='original'",
 "update artist_claims set status='rejected';update artist_claims set status='approved'",
 `update artist_claims set user_id='${claim}'`,
 "delete from artist_claims",
 "update artist_vault_sources set status='rejected';update artist_vault_sources set status='approved'",
 "update artist_vault_sources set publication='private';update artist_vault_sources set publication='inherit'",
 "delete from artist_vault_sources",
 `insert into mn_private.artist_bio_provenance values('${artist}','{}');delete from mn_private.artist_bio_provenance`,
])('permanently consumes exact allowance: %s',async mutation=>{
 const pg=await setup();try{await pg.exec(seed);await pg.exec(mutation);expect((await pg.query('select * from mn_private.legacy_bio_publications')).rows).toEqual([]);}finally{await pg.close();}
},30000);
it('does not auto seed; preserves unchanged text, new pending rejection, and rolled-back mutation',async()=>{
 const pg=await setup();try{
  expect((await pg.query('select * from mn_private.legacy_bio_publications')).rows).toEqual([]);
  await pg.exec(seed);
  await pg.exec(`update artists set bio=bio;insert into artist_vault_sources values('${artist}','pending','inherit');update artist_vault_sources set status='rejected' where status='pending'`);
  await expect(pg.transaction(async tx=>{await tx.exec("update artists set bio='changed'");throw new Error('rollback');})).rejects.toThrow('rollback');
  expect((await pg.query('select * from mn_private.legacy_bio_publications')).rows).toHaveLength(1);
  await pg.exec('set role mnweb');expect((await pg.query('select * from mn_private.legacy_bio_publications')).rows).toHaveLength(1);
  for(const q of [seed,'delete from mn_private.legacy_bio_publications',"update mn_private.legacy_bio_publications set bio_hash=repeat('b',64)"])await expect(pg.exec(q)).rejects.toThrow(/permission denied/);
  await pg.exec('reset role');for(const role of ['anon','authenticated']){await pg.exec(`set role ${role}`);await expect(pg.exec('select * from mn_private.legacy_bio_publications')).rejects.toThrow(/permission denied/);await pg.exec('reset role');}
 }finally{await pg.close();}
},30000);
it('invoker writes consume through the restricted trigger and unexpected default grants abort migration',async()=>{
 const pg=await setup();try{
  await pg.exec(seed);await pg.exec('grant update,select on artists to mnweb;set role mnweb');
  await pg.exec("update artists set bio='edited'");expect((await pg.query('select * from mn_private.legacy_bio_publications')).rows).toEqual([]);
  await pg.exec('reset role');
  await pg.exec('drop trigger consume_legacy_bio_text on artists;drop trigger consume_legacy_bio_claim on artist_claims;drop trigger consume_legacy_bio_source on artist_vault_sources;drop trigger consume_legacy_bio_provenance on mn_private.artist_bio_provenance;drop function mn_private.consume_legacy_bio_publication();drop table mn_private.legacy_bio_publications;create role unexpected;alter default privileges grant execute on functions to unexpected');
  await expect(pg.transaction(tx=>tx.exec(readFileSync('drizzle/0063_legacy_bio_publications.sql','utf8')))).rejects.toThrow(/Unexpected legacy publication grants/);
  expect((await pg.query("select to_regclass('mn_private.legacy_bio_publications') as name")).rows).toEqual([{name:null}]);
 }finally{await pg.close();}
},30000);
