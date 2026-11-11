/** @jest-environment node */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {drizzle} from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
import {recordSourceUrlReceipts} from '../recordSourceUrlReceipts';
import {writeBioProvenance} from '../writeBioProvenance';
import {saveBioHistory} from '../saveBioHistory';
import {preserveRevokedBio} from '../preserveRevokedBio';
const {PGlite}=process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const artist='00000000-0000-4000-8000-000000000001';
const url='HTTPS://example.com:443/Ä?x=%2f';
const provenance={version:1,kind:'generated',claimId:null,bioHash:'hash',sources:[{url}]};
async function setup() {
 const pg=new PGlite();
 await pg.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key,bio text);create table artist_bio_versions(id uuid primary key default gen_random_uuid(),artist_id uuid,bio_text text,is_pinned boolean default false,created_at timestamptz default now());insert into artists values('${artist}','Original');`);
 await pg.exec(readFileSync('drizzle/0061_about_evidence_provenance.sql','utf8'));
 return pg;
}
const migration=()=>readFileSync('drizzle/0062_public_url_receipts.sql','utf8');
it('migrates without backfill; mnweb has SELECT/INSERT only, anonymous/authenticated have no access',async()=>{
 const pg=await setup();try{
  await pg.exec(migration());
  expect((await pg.query('select * from mn_private.public_url_receipts')).rows).toEqual([]);
  await pg.exec('set role mnweb');
  const db=drizzle(pg,{schema});
  await db.transaction(tx=>recordSourceUrlReceipts(tx as never,[{url},{url}]));
  expect((await pg.query('select url,policy_version from mn_private.public_url_receipts')).rows).toEqual([{url,policy_version:1}]);
  for(const sql of ['delete from mn_private.public_url_receipts','update mn_private.public_url_receipts set policy_version=2','truncate mn_private.public_url_receipts']) await expect(pg.exec(sql)).rejects.toThrow(/permission denied/);
  await pg.exec('reset role');
  for(const role of ['anon','authenticated']) {
   await pg.exec(`set role ${role}`);
   await expect(pg.exec('select * from mn_private.public_url_receipts')).rejects.toThrow(/permission denied/);
   await pg.exec('reset role');
  }
 }finally{await pg.close();}
},30000);
it('refuses unexpected default grants and rolls back its DDL',async()=>{
 const pg=await setup();try{
  await pg.exec('create role unexpected;alter default privileges grant select on tables to unexpected');
  await expect(pg.transaction(tx=>tx.exec(migration()))).rejects.toThrow(/Unexpected URL receipt grants/);
  expect((await pg.query("select to_regclass('mn_private.public_url_receipts') as receipt")).rows).toEqual([{receipt:null}]);
 }finally{await pg.close();}
},30000);
it('current, deduplicated history and revoked history preserve exact receipts in their text transaction',async()=>{
 const pg=await setup();try{
  await pg.exec(migration());const db=drizzle(pg,{schema});
  await db.transaction(async tx=>{await writeBioProvenance(tx as never,artist,provenance);await saveBioHistory(tx as never,artist,[{text:'Original',provenance}]);});
  expect((await pg.query('select url from mn_private.public_url_receipts')).rows).toEqual([{url}]);
  await pg.exec('delete from mn_private.public_url_receipts');
  await db.transaction(tx=>saveBioHistory(tx as never,artist,[{text:'Original',provenance}]));
  expect((await pg.query('select url from mn_private.public_url_receipts')).rows).toEqual([{url}]);
  expect((await pg.query('select * from artist_bio_versions')).rows).toHaveLength(1);
  await pg.exec('delete from mn_private.public_url_receipts');
  await db.transaction(tx=>preserveRevokedBio(tx as never,artist));
  expect((await pg.query('select url from mn_private.public_url_receipts')).rows).toEqual([{url}]);
  expect((await pg.query('select * from artist_bio_versions')).rows).toHaveLength(1);
 }finally{await pg.close();}
},30000);
it.each(['conflict','storage'])('rolls back text/history/current lineage on receipt %s',async failure=>{
 const pg=await setup();try{
  await pg.exec(migration());const db=drizzle(pg,{schema});
  if(failure==='conflict') await pg.query("insert into mn_private.public_url_receipts values(decode($1,'hex'),'https://other.test',1)",[createHash('sha256').update(url).digest('hex')]);
  else await pg.exec('alter table mn_private.public_url_receipts add constraint reject_insert check(false)');
  await expect(db.transaction(async tx=>{
   await tx.update(schema.artists).set({bio:'Changed'});
   await saveBioHistory(tx as never,artist,[{text:'Changed',provenance:null}]);
   await writeBioProvenance(tx as never,artist,provenance);
  })).rejects.toThrow();
  expect((await pg.query('select bio from artists')).rows).toEqual([{bio:'Original'}]);
  expect((await pg.query('select * from artist_bio_versions')).rows).toEqual([]);
  expect((await pg.query('select * from mn_private.artist_bio_provenance')).rows).toEqual([]);
 }finally{await pg.close();}
},30000);
it('policy-rejected evidence preserves text/lineage without receipt',async()=>{
 const pg=await setup();try{
  await pg.exec(migration());const db=drizzle(pg,{schema});
  const rejected={...provenance,kind:'authored',sources:[{url:'https://example.com?token=private'}]};
  await db.transaction(tx=>writeBioProvenance(tx as never,artist,rejected));
  expect((await pg.query('select provenance from mn_private.artist_bio_provenance')).rows).toEqual([{provenance:rejected}]);
  expect((await pg.query('select * from mn_private.public_url_receipts')).rows).toEqual([]);
 }finally{await pg.close();}
},30000);
