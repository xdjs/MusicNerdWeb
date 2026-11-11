import { namespaceDatabase } from './fixtures/namespace-database.mjs';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const names=['0061_about_evidence_provenance','0062_public_url_receipts','0063_legacy_bio_publications','0064_lore_activity_lock'];
const migrations=await Promise.all(names.map(n=>readFile(new URL(`../../drizzle/${n}.sql`,import.meta.url),'utf8')));
async function fixture(existing=true){
 const pg=await namespaceDatabase();
 await pg.exec(`create role mnweb;create role anon;create role authenticated;create role unexpected_reader;create role inherited_reader;grant anon to inherited_reader;
 create table artists(id uuid primary key,bio text);create table artist_bio_versions(id uuid primary key,artist_id uuid,is_pinned boolean);
 create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text);
 create table artist_vault_sources(id uuid primary key,artist_id uuid,activity_id uuid,status text,publication text);
 create table artist_activity_events(id uuid primary key);
 ${existing?`create schema mn_private;grant usage on schema mn_private to anon,authenticated,mnweb;
 create table mn_private.publishing_keys(id integer primary key);create table mn_private.moderators(id integer primary key);
 insert into mn_private.publishing_keys values(1);
 create function mn_private.is_moderator() returns boolean language sql security definer set search_path=pg_catalog as 'select true';
 grant execute on function mn_private.is_moderator() to anon,authenticated;`:''}`);
 return pg;
}
const apply=pg=>pg.transaction(async tx=>{for(const sql of migrations)await tx.exec(sql)});
async function snapshot(pg){return (await pg.query(`select n.nspacl::text as acl,pg_get_userbyid(n.nspowner) as owner,
 pg_get_functiondef('mn_private.is_moderator()'::regprocedure) as definition,
 (select proacl::text from pg_proc where oid='mn_private.is_moderator()'::regprocedure) as function_acl,
 (select jsonb_agg(id) from mn_private.publishing_keys) as rows
 from pg_namespace n where n.nspname='mn_private'`)).rows;}
for(const existing of [true,false])test(`installs safely into ${existing?'existing production-shaped':'fresh'} namespace`,async()=>{
 const pg=await fixture(existing);try{
 const before=existing?await snapshot(pg):null;await apply(pg);
 if(existing)assert.deepEqual(await snapshot(pg),before);
 for(const role of ['anon','authenticated','inherited_reader','unexpected_reader']){
  await pg.exec(`set role ${role}`);
  if(existing&&role!=='unexpected_reader')assert.equal((await pg.query('select mn_private.is_moderator() as ok')).rows[0].ok,true);
  for(const table of ['artist_bio_provenance','artist_bio_version_provenance','public_url_receipts','legacy_bio_publications'])await assert.rejects(pg.query(`select * from mn_private.${table}`),{code:'42501'});
  await assert.rejects(pg.query("select mn_private.lock_lore_activity_events('00000000-0000-4000-8000-000000000001')"),{code:'42501'});
  await pg.exec('reset role');
 }
 await pg.exec('set role mnweb');
 for(const table of ['artist_bio_provenance','artist_bio_version_provenance','public_url_receipts','legacy_bio_publications'])assert.deepEqual((await pg.query(`select * from mn_private.${table}`)).rows,[]);
 await assert.rejects(pg.exec('create table mn_private.unapproved(id int)'),{code:'42501'});
 await assert.rejects(pg.exec("insert into mn_private.legacy_bio_publications values(gen_random_uuid(),gen_random_uuid(),repeat('a',64))"),{code:'42501'});
 await pg.exec('reset role');
 await assert.rejects(apply(pg)); // Existing About objects must never be silently adopted.
 }finally{await pg.close()}
});
for(const mutation of [
 'grant create on schema mn_private to unexpected_reader',
 'grant create on schema mn_private to public',
 'grant create on schema mn_private to anon',
 'grant mnweb to anon',
 `alter role unexpected_reader noinherit;DO $$ BEGIN EXECUTE format('GRANT %I TO unexpected_reader WITH INHERIT FALSE, SET TRUE',current_user);END $$`,
 'alter default privileges in schema mn_private grant select on tables to mnweb with grant option',
 'grant mnweb to unexpected_reader',
 'alter schema mn_private owner to unexpected_reader',
 'alter default privileges in schema mn_private grant select on tables to unexpected_reader',
 'alter default privileges grant execute on functions to unexpected_reader',
])test(`refuses unsafe namespace/object access atomically: ${mutation}`,async()=>{
 const pg=await fixture();try{await pg.exec(mutation);const before=await snapshot(pg);
 await assert.rejects(apply(pg));
 assert.equal((await pg.query("select to_regclass('mn_private.artist_bio_provenance') as relation")).rows[0].relation,null);
 assert.deepEqual(await snapshot(pg),before);
 }finally{await pg.close()}
});

const preflight=await readFile(new URL('./legacy-about-preflight.sql',import.meta.url),'utf8');
const activate=await readFile(new URL('./legacy-about-activate.sql',import.meta.url),'utf8');
const publication=await readFile(new URL('../../drizzle/0060_source_publication.sql',import.meta.url),'utf8');
async function legacyFixture(){
 const pg=await fixture();
 await pg.exec(`alter table artist_vault_sources drop column publication;
 insert into artists select lpad(i::text,32,'0')::uuid,'Original '||i from generate_series(1,16) i;
 insert into artist_claims select id,id,id,'approved' from artists;
 insert into artist_vault_sources(id,artist_id,status) select id,id,'approved' from artists;
 create temp table about_legacy_manifest(artist_id uuid primary key,claim_id uuid unique not null,bio_hash text not null,pinned_version_id uuid,source_checkpoint_hash text not null);
 insert into about_legacy_manifest select a.id,a.id,encode(sha256(convert_to(a.bio,'UTF8')),'hex'),null,
 encode(sha256(convert_to(coalesce((select jsonb_agg(to_jsonb(s) order by s.id)::text from artist_vault_sources s where s.artist_id=a.id),'[]'),'UTF8')),'hex') from artists a;`);
 return pg;
}
test('checks exact16 before column addition, activates once, and rolls back schema and allowances together',async()=>{
 const pg=await legacyFixture();const rollback=new Error('synthetic rollback');try{
 await assert.rejects(pg.transaction(async tx=>{
  await tx.exec(preflight);await tx.exec(publication);for(const sql of migrations)await tx.exec(sql);
  await tx.exec(activate);assert.equal((await tx.query('select count(*)::int as n from mn_private.legacy_bio_publications')).rows[0].n,16);
  throw rollback;
 }),e=>e===rollback);
 assert.equal((await pg.query("select to_regclass('mn_private.legacy_bio_publications') as relation")).rows[0].relation,null);
 assert.equal((await pg.query("select count(*)::int as n from information_schema.columns where table_name='artist_vault_sources' and column_name='publication'")).rows[0].n,0);
 }finally{await pg.close()}
});
for(const mutation of [
 "delete from artist_vault_sources where id=(select min(id::text)::uuid from artists)",
 "update artist_vault_sources set status='rejected'",
 "update artists set bio='changed'",
 "update artist_claims set status='rejected'",
 "delete from about_legacy_manifest where artist_id=(select min(id::text)::uuid from artists)",
 "alter table artist_vault_sources add column publication text default 'inherit'",
])test(`legacy activation rejects drift: ${mutation}`,async()=>{
 const pg=await legacyFixture();try{await pg.exec(mutation);await assert.rejects(pg.transaction(tx=>tx.exec(preflight)));}
 finally{await pg.close()}
});

// Provider-role compatibility is deliberately exact; these are synthetic roles.
async function managedCliFixture(){
 const pg=await fixture();
 await pg.exec(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres NOLOGIN NOSUPERUSER BYPASSRLS; END IF; END $$;
 CREATE ROLE supabase_admin LOGIN SUPERUSER INHERIT CREATEROLE CREATEDB REPLICATION BYPASSRLS CONNECTION LIMIT -1;
 CREATE ROLE cli_login_postgres LOGIN NOSUPERUSER NOINHERIT NOCREATEROLE NOCREATEDB NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1;
 ALTER SCHEMA mn_private OWNER TO postgres;
 GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
 DO $$ BEGIN EXECUTE format('GRANT CREATE ON DATABASE %I TO postgres',current_database()); END $$;
 GRANT postgres TO supabase_admin WITH ADMIN TRUE;
 SET ROLE supabase_admin;
 GRANT postgres TO cli_login_postgres WITH ADMIN FALSE, INHERIT FALSE, SET TRUE GRANTED BY supabase_admin;
 RESET ROLE;`);
 return pg;
}
const managedRoleSnapshot=pg=>pg.query(`select member,roleid,grantor,admin_option,inherit_option,set_option from pg_auth_members where member=(select oid from pg_roles where rolname='cli_login_postgres') or roleid=(select oid from pg_roles where rolname='cli_login_postgres') order by member,roleid,grantor`);
test('accepts only exact managed CLI owner membership without changing roles or namespace ACL',async()=>{
 const pg=await managedCliFixture();try{
 const before=await snapshot(pg);const memberships=await managedRoleSnapshot(pg);
 await pg.exec('set role postgres');await apply(pg);await pg.exec('reset role');
 assert.deepEqual(await snapshot(pg),before);assert.deepEqual(await managedRoleSnapshot(pg),memberships);
 await pg.exec('set role mnweb');await assert.rejects(pg.exec('create table mn_private.forbidden(id int)'),{code:'42501'});await pg.exec('reset role');
 }finally{await pg.close()}
});
for(const mutation of [
 'alter role cli_login_postgres superuser',
 'alter role cli_login_postgres inherit',
 'alter role cli_login_postgres createrole',
 'alter role cli_login_postgres createdb',
 'alter role cli_login_postgres nologin',
 'alter role cli_login_postgres replication',
 'alter role cli_login_postgres bypassrls',
 'alter role cli_login_postgres connection limit 1',
 'set role supabase_admin;grant postgres to cli_login_postgres with admin true granted by supabase_admin;reset role',
 'set role supabase_admin;grant postgres to cli_login_postgres with inherit true granted by supabase_admin;reset role',
 'set role supabase_admin;grant postgres to cli_login_postgres with set false granted by supabase_admin;reset role',
 'set role supabase_admin;revoke postgres from cli_login_postgres granted by supabase_admin;reset role;grant postgres to cli_login_postgres with admin false,inherit false,set true',
 'grant unexpected_reader to cli_login_postgres',
 'grant cli_login_postgres to unexpected_reader with inherit false,set true',
 'grant create on schema mn_private to cli_login_postgres',
 'alter role supabase_admin nologin',
])test(`refuses managed CLI drift atomically: ${mutation}`,async()=>{
 const pg=await managedCliFixture();try{
 await pg.exec(mutation);const before=await snapshot(pg);
 await pg.exec('set role postgres');await assert.rejects(apply(pg));await pg.exec('reset role');
 assert.equal((await pg.query("select to_regclass('mn_private.artist_bio_provenance') as relation")).rows[0].relation,null);
 assert.deepEqual(await snapshot(pg),before);
 }finally{await pg.close()}
});
