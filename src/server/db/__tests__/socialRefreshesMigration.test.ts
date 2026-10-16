/** @jest-environment node */
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const artist = "11111111-1111-4111-8111-111111111111";
let db: InstanceType<typeof PGlite>;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role mnweb; create role anon; create role authenticated;
    create table artists(id uuid primary key); grant usage on schema public to mnweb;
    insert into artists values('${artist}');`);
  await db.exec(readFileSync(resolve("drizzle/0052_social_refreshes.sql"), "utf8"));
});
afterAll(async () => { await db?.close(); });
afterEach(async () => { await db.exec("reset role"); });

it("permits actual server CRUD but denies public roles and enables four RLS policies", async () => {
  expect((await db.query("select relrowsecurity from pg_class where relname='artist_social_refreshes'")).rows).toEqual([{ relrowsecurity: true }]);
  expect((await db.query("select count(*)::int as count from pg_policies where tablename='artist_social_refreshes' and roles = ARRAY['mnweb']::name[]")).rows).toEqual([{ count: 4 }]);
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.exec("select * from artist_social_refreshes"), /permission denied/);
    await db.exec("reset role");
  }
  await db.exec("set role mnweb");
  await db.exec(`insert into artist_social_refreshes(artist_id,platform,account_handle,checked_at,scan_started_at,status,item_count,run_id)
    values('${artist}','instagram','artist_handle',now(),now(),'limited',9,'run-1')`);
  expect((await db.query("select covered_through from artist_social_refreshes")).rows).toEqual([{ covered_through: null }]);
  expect((await db.query("select scan_reference from artist_social_refreshes")).rows).toEqual([{ scan_reference: {} }]);
  await db.exec(`update artist_social_refreshes set scan_reference='{"anchors":[{"id":"post-1","postedAt":"2026-10-12T00:00:00Z"}],"gapSince":null}'`);
  expect((await db.query("select scan_reference from artist_social_refreshes")).rows).toEqual([{ scan_reference: { anchors: [{ id: "post-1", postedAt: "2026-10-12T00:00:00Z" }], gapSince: null } }]);
  await db.exec("update artist_social_refreshes set status='complete', covered_through=scan_started_at");
  expect((await db.query("select status from artist_social_refreshes")).rows).toEqual([{ status: "complete" }]);
  await db.exec("delete from artist_social_refreshes");
  expect((await db.query("select * from artist_social_refreshes")).rows).toEqual([]);
});

it("validates identity, scan dates, status, count and run id", async () => {
  await db.exec(`insert into artist_social_refreshes(artist_id,platform,account_handle,covered_through,checked_at,scan_started_at,status,item_count,run_id) values('${artist}','x','artist_handle',null,now(),now(),'limited',0,'run-2')`);
  for (const assignment of ["platform='youtube'", "account_handle=''", "account_handle='@artist'", "account_handle='Artist'", "account_handle=' artist'", "scan_reference='[]'", "scan_reference='null'", "scan_reference='1'", "scope='unknown'", "scope='latest'", "status='failed'", "status='complete'", "item_count=-1", "run_id=''", "run_id=' '", "checked_at=scan_started_at-interval '1 second'", "covered_through=scan_started_at+interval '1 second'"]) {
    await assert.rejects(db.exec(`update artist_social_refreshes set ${assignment}`), /check constraint/);
  }
  await assert.rejects(db.exec("update artist_social_refreshes set scan_reference=null"), /not-null constraint/);
  await assert.rejects(db.exec("update artist_social_refreshes set checked_at=null"), /not-null constraint/);
  await db.exec("delete from artist_social_refreshes");
});

it("keeps Latest coverage separate from a full profile baseline", async () => {
  await db.exec(`insert into artist_social_refreshes(artist_id,platform,account_handle,scope,covered_through,checked_at,scan_started_at,status,item_count,run_id) values
    ('${artist}','instagram','scope_test','latest',now(),now(),now(),'complete',2,'latest-run'),
    ('${artist}','instagram','scope_test','profile',null,now(),now(),'limited',200,'profile-run')`);
  expect((await db.query("select covered_through from artist_social_refreshes where scope='profile'")).rows).toEqual([{ covered_through: null }]);
  expect((await db.query("select count(*)::int as count from artist_social_refreshes where account_handle='scope_test'")).rows).toEqual([{ count: 2 }]);
  await db.exec("delete from artist_social_refreshes");
});

it("keeps different account checkpoints separate and deletes them with the artist", async () => {
  await db.exec(`insert into artist_social_refreshes(artist_id,platform,account_handle,covered_through,checked_at,scan_started_at,status,item_count,run_id) values
    ('${artist}','tiktok','first',null,now(),now(),'limited',50,'run-3'),
    ('${artist}','tiktok','second',null,now(),now(),'limited',50,'run-4')`);
  await assert.rejects(db.exec(`insert into artist_social_refreshes(artist_id,platform,account_handle,covered_through,checked_at,scan_started_at,status,item_count,run_id) values('${artist}','tiktok','first',null,now(),now(),'limited',50,'run-5')`), /duplicate key/);
  await assert.rejects(db.exec("update artist_social_refreshes set artist_id='22222222-2222-4222-8222-222222222222'"), /foreign key constraint/);
  await db.exec(`delete from artists where id='${artist}'`);
  expect((await db.query("select * from artist_social_refreshes")).rows).toEqual([]);
});
