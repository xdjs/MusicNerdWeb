/** @jest-environment node */
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/server/db/schema";
jest.mock("@/server/db/drizzle", () => ({
  get db() {
    return database;
  },
}));
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
const client = new PGlite();
const driver = drizzle(client, { schema });
const database = {
  ...driver,
  transaction: (fn: (tx: unknown) => Promise<unknown>) =>
    driver.transaction((tx) =>
      fn({
        ...tx,
        query: tx.query,
        insert: tx.insert.bind(tx),
        execute: async (query: Parameters<typeof tx.execute>[0]) =>
          (await tx.execute(query)).rows,
      }),
    ),
};
const artist = "00000000-0000-4000-8000-000000000001",
  user = "00000000-0000-4000-8000-000000000002",
  claim = "00000000-0000-4000-8000-000000000003";
let request: typeof import("../requestLatestRefresh").requestLatestRefresh;
let context: typeof import("../../artistOperationContext").withArtistOperation;
beforeAll(async () => {
  jest.resetModules();
  ({ requestLatestRefresh: request } = await import("../requestLatestRefresh"));
  ({ withArtistOperation: context } = await import(
    "../../artistOperationContext"
  ));
  await client.exec(`
 CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
 create table artists(id uuid primary key,instagram text,inprocess text,spotify text,deezer text);
 create table users(id uuid primary key,is_admin boolean);
 create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text,reference_code text,created_at timestamptz,updated_at timestamptz);
 create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
 create table artist_research_jobs(id uuid primary key default gen_random_uuid(),artist_id uuid,kind text constraint artist_research_jobs_kind_check check(kind in ('social_ingest','caption_extract','lore_refresh','source_search')),status text default 'pending',state jsonb,activity_id uuid,created_at timestamptz default now(),updated_at timestamptz default now());
 create unique index jobs_live on artist_research_jobs(artist_id,kind) where status in ('pending','running');
 insert into artists values('${artist}','artist',null,null,null);
 insert into users values('${user}',false);
 insert into artist_claims(id,artist_id,user_id,status)values('${claim}','${artist}','${user}','approved');
 `);
  await client.exec(readFileSync("drizzle/0034_latest_refresh.sql", "utf8"));
}, 30000);
afterAll(async () => {
  await client.close();
});
const call = () =>
  context(
    artist,
    { userId: user, expectedClaimId: claim, trigger: "manual_latest_refresh" },
    () => request(artist),
  );
it("coalesces simultaneous requests and persists only the initiating event", async () => {
  const ids = await Promise.all(Array.from({ length: 5 }, call));
  expect(new Set(ids).size).toBe(1);
  expect(
    (await client.query("select * from artist_research_jobs")).rows,
  ).toHaveLength(1);
  expect(
    (await client.query("select * from artist_activity_events")).rows,
  ).toMatchObject([{ actor_user_id: user, trigger: "manual_latest_refresh" }]);
});
it("retains a completed request through the cooldown", async () => {
  const before = await call();
  await client.exec("update artist_research_jobs set status='done'");
  expect(await call()).toBe(before);
  await client.exec(
    "update artist_research_jobs set created_at=now()-interval '31 minutes'",
  );
  expect(await call()).not.toBe(before);
});
it("rejects a stale claim without writing a job", async () => {
  const before = (await client.query("select id from artist_research_jobs"))
    .rows.length;
  await client.exec("update artist_claims set status='revoked'");
  await expect(call()).rejects.toThrow("ownership changed");
  expect(
    (await client.query("select id from artist_research_jobs")).rows,
  ).toHaveLength(before);
});
