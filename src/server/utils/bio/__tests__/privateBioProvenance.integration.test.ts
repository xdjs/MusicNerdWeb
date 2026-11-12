/** @jest-environment node */
import {readFileSync} from 'node:fs';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
it('keeps provenance outside public row reads and grants only mnweb sidecar CRUD',async()=>{
 const pg=new PGlite(); const artist='00000000-0000-4000-8000-000000000001';
 try{
  await pg.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key,bio text);create table artist_bio_versions(id uuid primary key,artist_id uuid,bio_text text);grant select on artists,artist_bio_versions to anon,authenticated;insert into artists values('${artist}','Legacy');insert into artist_bio_versions values('${artist}','${artist}','Legacy');`);
  await pg.exec(readFileSync('drizzle/0061_about_evidence_provenance.sql','utf8'));
  await pg.exec('set role mnweb');
  await pg.query('insert into mn_private.artist_bio_provenance values($1,$2)',[artist,{secret:'server only'}]);
  await pg.query('insert into mn_private.artist_bio_version_provenance values($1,$2)',[artist,{secret:'history'}]);
  expect((await pg.query('select provenance from mn_private.artist_bio_provenance')).rows).toEqual([{provenance:{secret:'server only'}}]);
  await expect(pg.exec("update mn_private.artist_bio_provenance set provenance='null'::jsonb")).rejects.toThrow(/check constraint/);
  await pg.exec("update mn_private.artist_bio_provenance set provenance='{}'::jsonb");
  await pg.exec('delete from mn_private.artist_bio_version_provenance;reset role');
  for(const role of ['anon','authenticated']) {
   await pg.exec(`set role ${role}`);
   expect((await pg.query('select * from public.artists')).rows).toEqual([{id:artist,bio:'Legacy'}]);
   await expect(pg.query('select * from mn_private.artist_bio_provenance')).rejects.toThrow(/permission denied/);
   await expect(pg.query('select * from mn_private.artist_bio_version_provenance')).rejects.toThrow(/permission denied/);
   await pg.exec('reset role');
  }
  expect((await pg.query("select column_name from information_schema.columns where table_schema='public' and column_name='bio_provenance'")).rows).toEqual([]);
  await pg.query('insert into mn_private.artist_bio_version_provenance values($1,$2)',[artist,{history:'protected'}]);
  await pg.exec('delete from artist_bio_versions');
  expect((await pg.query('select * from mn_private.artist_bio_version_provenance')).rows).toEqual([]);
  await pg.exec('delete from artists');expect((await pg.query('select * from mn_private.artist_bio_provenance')).rows).toEqual([]);
 }finally{await pg.close();}
},30000);
it.each(['default-grant','schema-owner','public-column'])('refuses unsafe prior state: %s',async scenario=>{
 const pg=new PGlite();
 try{
  await pg.exec('create role mnweb;create role anon;create role authenticated;create role unexpected;create table artists(id uuid primary key);create table artist_bio_versions(id uuid primary key);');
  if(scenario==='default-grant') await pg.exec('alter default privileges grant select on tables to unexpected');
  if(scenario==='schema-owner') await pg.exec('create schema mn_private authorization unexpected');
  if(scenario==='public-column') await pg.exec('alter table artists add column bio_provenance jsonb');
  await expect(pg.exec(readFileSync('drizzle/0061_about_evidence_provenance.sql','utf8'))).rejects.toThrow(scenario==='default-grant' ? /Unexpected provenance/ : scenario==='public-column' ? /Public provenance columns/ : /Unsafe private schema owner/);
 }finally{await pg.close();}
},30000);
