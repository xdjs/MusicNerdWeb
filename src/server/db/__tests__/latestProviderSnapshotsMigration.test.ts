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
  await db.exec(readFileSync(resolve(process.cwd(), "drizzle/0045_latest_provider_snapshots.sql"), "utf8"));
});
afterAll(async () => { await db?.close(); });
it("exposes snapshots only to the server role with RLS enabled", async () => {
  expect((await db.query("select relrowsecurity from pg_class where relname='artist_latest_provider_snapshots'")).rows[0]).toEqual({ relrowsecurity: true });
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.exec("select * from artist_latest_provider_snapshots"), /permission denied/);
    await db.exec("reset role");
  }
  await db.exec("set role mnweb");
  await db.exec(`insert into artist_latest_provider_snapshots(artist_id,provider,account_id,status,items)
    values('${artist}','spotify','account','checked','[{"card":{"id":"release:spotify:1"}}]');`);
  expect((await db.query("select account_id from artist_latest_provider_snapshots")).rows).toEqual([{ account_id: "account" }]);
  await db.exec(`update artist_latest_provider_snapshots set items='[]',checked_at=now() where artist_id='${artist}'`);
  expect((await db.query("select items from artist_latest_provider_snapshots")).rows).toEqual([{ items: [] }]);
  await db.exec("reset role");
});
it("bounds provider identity, status and stored payload", async () => {
  for (const assignment of ["provider='unknown'", "status='unknown'", "account_id=''", "items='{}'", "items=(select jsonb_agg(n) from generate_series(1,51) n)", "items=jsonb_build_array(repeat('a',400001))"]) {
    await assert.rejects(db.exec(`update artist_latest_provider_snapshots set ${assignment}`), /check constraint/);
  }
});
it("has one replaceable snapshot per artist/provider and cascades artist deletion", async () => {
  await assert.rejects(db.exec(`insert into artist_latest_provider_snapshots(artist_id,provider,account_id,status) values('${artist}','spotify','other','checked')`), /duplicate key/);
  await db.exec(`delete from artists where id='${artist}'`);
  expect((await db.query("select * from artist_latest_provider_snapshots")).rows).toEqual([]);
});
