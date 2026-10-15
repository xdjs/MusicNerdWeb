/** @jest-environment node */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
let reserveQuestionPlanning: typeof import("../reserveQuestionPlanning").reserveQuestionPlanning;
jest.mock("@/server/db/drizzle", () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
const client = new PGlite();
const dialect = new PgDialect();
const fixedNow = "2026-10-15T12:00:00.000Z";
let clock = fixedNow;
// Execute the real statements/transactions/roles, changing only the database
// clock expression so exact rolling-window boundaries need no wall-clock sleeps.
const database = { transaction: (fn: (tx: { execute: (query: SQL) => Promise<unknown[]> }) => Promise<unknown>) => client.transaction(async tx => {
  await tx.exec("set local role mnweb");
  return fn({ execute: async query => {
    const compiled = dialect.sqlToQuery(query);
    const statement = compiled.sql.replace(/\b(?:clock_timestamp|now)\(\)/g, `'${clock}'::timestamptz`);
    return (await tx.query(statement, compiled.params)).rows;
  } });
}) };
const artist = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const third = "33333333-3333-4333-8333-333333333333";
const visitor = "a".repeat(64);
const otherVisitor = "b".repeat(64);
const time = (offsetMinutes: number) => new Date(Date.parse(fixedNow) + offsetMinutes * 60_000).toISOString();
beforeAll(async () => {
  jest.resetModules();
  ({ reserveQuestionPlanning } = await import("../reserveQuestionPlanning"));
  await client.exec(`create role mnweb; create role anon; create role authenticated; create role service_role bypassrls;
    alter default privileges grant all on tables to anon,authenticated,service_role;
    create table artists(id uuid primary key);insert into artists values('${artist}'),('${other}'),('${third}');
    create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid references artists(id),actor_user_id uuid,actor_kind text,action text,trigger text,created_at timestamptz default now());
    grant select,insert on artist_activity_events to mnweb;`);
  await client.exec(readFileSync(resolve("drizzle/0049_question_planning_admissions.sql"), "utf8"));
}, 30000);
beforeEach(async () => {
  clock = fixedNow;
  await client.exec("reset role; delete from artist_activity_events; delete from question_planning_admissions");
});
afterAll(async () => { await client.close(); });
async function seedGlobal(n: number, id = artist, at = time(-10)) {
  await client.query("insert into artist_activity_events(artist_id,actor_kind,action,trigger,created_at) select $1::uuid,'system','question_plan','ask_about_budget',$3::timestamptz from generate_series(1,$2::int)", [id, n, at]);
}
async function seedVisitor(n: number, key = visitor, at = time(-10)) {
  await client.query("insert into question_planning_admissions(visitor_key,admitted_at) select $1,$3::timestamptz from generate_series(1,$2::int)", [key, n, at]);
}
async function counts() {
  return (await client.query("select (select count(*)::int from artist_activity_events) as audit,(select count(*)::int from question_planning_admissions) as admissions")).rows[0];
}
it("stores only a visitor digest and timestamp, preserving anonymous system audit attribution", async () => {
  await reserveQuestionPlanning(artist, visitor);
  expect((await client.query("select artist_id,actor_user_id,actor_kind,action,trigger from artist_activity_events")).rows)
    .toEqual([{ artist_id: artist, actor_user_id: null, actor_kind: "system", action: "question_plan", trigger: "ask_about_budget" }]);
  expect((await client.query("select visitor_key,(extract(epoch from admitted_at)*1000)::double precision as admitted_at_ms from question_planning_admissions")).rows)
    .toEqual([{ visitor_key: visitor, admitted_at_ms: Date.parse(fixedNow) }]);
  expect((await client.query("select column_name from information_schema.columns where table_name='question_planning_admissions' order by ordinal_position")).rows)
    .toEqual([{ column_name: "visitor_key" }, { column_name: "admitted_at" }]);
});
it("allows only one concurrent admission in a visitor's final hourly slot", async () => {
  await seedVisitor(29);
  const outcomes = await Promise.allSettled([reserveQuestionPlanning(artist, visitor), reserveQuestionPlanning(other, visitor)]);
  expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find(result => result.status === "rejected")).toMatchObject({ reason: {
    status: 429, code: "visitor_question_quota", retryAfterSeconds: 3000, resetAt: time(50),
  } });
  expect(await counts()).toEqual({ audit: 1, admissions: 30 });
});
it("isolates two visitors on one artist and removes the old artist-wide ten-question cap", async () => {
  await seedGlobal(10);
  await seedVisitor(30);
  await expect(reserveQuestionPlanning(artist, visitor)).rejects.toMatchObject({ code: "visitor_question_quota" });
  await expect(reserveQuestionPlanning(artist, otherVisitor)).resolves.toBeUndefined();
  expect(await counts()).toEqual({ audit: 11, admissions: 31 });
});
it("shares one visitor's hourly budget across different artist profiles", async () => {
  for (let i = 0; i < 30; i++) await reserveQuestionPlanning(i % 2 ? artist : other, visitor);
  await expect(reserveQuestionPlanning(third, visitor)).rejects.toMatchObject({
    code: "visitor_question_quota", retryAfterSeconds: 3600, resetAt: time(60),
  });
  expect(await counts()).toEqual({ audit: 30, admissions: 30 });
});
it("opens a visitor slot exactly when the oldest counted admission expires, using DB time", async () => {
  await seedVisitor(1, visitor, time(-59));
  await seedVisitor(29, visitor, time(-5));
  await expect(reserveQuestionPlanning(artist, visitor)).rejects.toMatchObject({
    code: "visitor_question_quota", retryAfterSeconds: 60, resetAt: time(1),
  });
  clock = time(1);
  await expect(reserveQuestionPlanning(artist, visitor)).resolves.toBeUndefined();
  expect(await counts()).toEqual({ audit: 1, admissions: 30 });
});
it("enforces the global final slot across visitors and different artists", async () => {
  await seedGlobal(199, other);
  const outcomes = await Promise.allSettled([reserveQuestionPlanning(artist, visitor), reserveQuestionPlanning(third, otherVisitor)]);
  expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find(result => result.status === "rejected")).toMatchObject({ reason: {
    status: 429, code: "question_planning_quota", retryAfterSeconds: 85800, resetAt: time(1430),
  } });
  expect(await counts()).toEqual({ audit: 200, admissions: 1 });
});
it("keeps legacy global events and resets the global gate at its exact rolling-day boundary", async () => {
  await seedGlobal(1, artist, time(-1439));
  await seedGlobal(199, other, time(-10));
  await expect(reserveQuestionPlanning(third, visitor)).rejects.toMatchObject({
    code: "question_planning_quota", retryAfterSeconds: 60, resetAt: time(1),
  });
  clock = time(1);
  await expect(reserveQuestionPlanning(third, visitor)).resolves.toBeUndefined();
  expect(await counts()).toEqual({ audit: 201, admissions: 1 });
});
it("reports the later active gate when both visitor and global limits are exhausted", async () => {
  await seedVisitor(30, visitor, time(-10));
  await seedGlobal(200, other, time(-1430));
  await expect(reserveQuestionPlanning(artist, visitor)).rejects.toMatchObject({
    code: "visitor_question_quota", retryAfterSeconds: 3000, resetAt: time(50),
  });
});
it("reports when a real slot opens even if legacy global usage exceeds the ceiling", async () => {
  await seedGlobal(1, artist, time(-1439));
  await seedGlobal(200, other, time(-1430));
  await expect(reserveQuestionPlanning(third, visitor)).rejects.toMatchObject({
    code: "question_planning_quota", retryAfterSeconds: 600, resetAt: time(10),
  });
});
it("prunes expired visitor digests even on denial, without deleting old audit events", async () => {
  await seedVisitor(2, otherVisitor, time(-61));
  await seedVisitor(30);
  await seedGlobal(10, artist, time(-1500));
  await expect(reserveQuestionPlanning(artist, visitor)).rejects.toMatchObject({ code: "visitor_question_quota" });
  expect(await counts()).toEqual({ audit: 10, admissions: 30 });
});
it("excludes unrelated contribution activity from the global limit", async () => {
  await seedGlobal(200);
  await client.exec("update artist_activity_events set action='source_added',actor_kind='user',trigger='editor_source'");
  await expect(reserveQuestionPlanning(artist, visitor)).resolves.toBeUndefined();
});
it("rolls back the visitor admission if the audit reservation cannot be inserted", async () => {
  await expect(reserveQuestionPlanning("44444444-4444-4444-8444-444444444444", visitor)).rejects.toThrow();
  expect(await counts()).toEqual({ audit: 0, admissions: 0 });
});
it("rejects unhashed visitor identifiers before creating audit or quota records", async () => {
  await expect(reserveQuestionPlanning(artist, "192.0.2.1")).rejects.toThrow();
  expect(await counts()).toEqual({ audit: 0, admissions: 0 });
});
it.each(["anon", "authenticated", "service_role"])("denies %s all access to private admissions", async role => {
  await client.exec(`set role ${role}`);
  await expect(client.query("select * from question_planning_admissions")).rejects.toThrow(/permission denied/);
  await expect(client.query("insert into question_planning_admissions(visitor_key) values($1)", [visitor])).rejects.toThrow(/permission denied/);
  await expect(client.query("delete from question_planning_admissions")).rejects.toThrow(/permission denied/);
  await client.exec("reset role");
});
it("restricts mnweb to read/insert/prune and enables RLS with only mnweb policies", async () => {
  await client.exec("set role mnweb");
  await client.query("insert into question_planning_admissions(visitor_key) values($1)", [visitor]);
  await expect(client.query("update question_planning_admissions set admitted_at=now()")).rejects.toThrow(/permission denied/);
  await expect(client.query("truncate question_planning_admissions")).rejects.toThrow(/permission denied/);
  await expect(client.query("insert into question_planning_admissions(visitor_key) values('raw-identifier')")).rejects.toThrow(/check constraint/);
  await client.exec("reset role");
  expect((await client.query("select relrowsecurity from pg_class where relname='question_planning_admissions'")).rows)
    .toEqual([{ relrowsecurity: true }]);
  expect((await client.query("select cmd,roles::text from pg_policies where tablename='question_planning_admissions' order by cmd")).rows)
    .toEqual([{ cmd: "DELETE", roles: "{mnweb}" }, { cmd: "INSERT", roles: "{mnweb}" }, { cmd: "SELECT", roles: "{mnweb}" }]);
});
