/** @jest-environment node */
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
let db: InstanceType<typeof PGlite>;
const artist = "11111111-1111-4111-8111-111111111111",
  boundary = "22222222-2222-4222-8222-222222222222";
const insert = () =>
  db.exec(
    `insert into artist_interview_boundaries(id,artist_id,request_id,wording,scope,sitting,origin_question_key,origin_question)values('${boundary}','${artist}','${boundary}','Please leave my family out of this interview.','sitting',2,'offered-question','An exact offered question?')`,
  );
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role mnweb;create role anon;create role authenticated;create function uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';create table artists(id uuid primary key);create table users(id uuid primary key);create table artist_activity_events(id uuid primary key);create table artist_interview_answers(id uuid primary key);grant usage on schema public to mnweb;grant select,delete on artists to mnweb;insert into artists values('${artist}');`,
  );
  await db.exec(
    readFileSync(
      resolve(process.cwd(), "drizzle/0041_interview_memory.sql"),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role;delete from artist_interview_boundaries;set role mnweb;",
  );
});
it("preserves exact wording and scope under the application role", async () => {
  await insert();
  expect(
    (
      await db.query(
        "select wording,scope,sitting,retracted_at from artist_interview_boundaries",
      )
    ).rows,
  ).toEqual([
    {
      wording: "Please leave my family out of this interview.",
      scope: "sitting",
      sitting: 2,
      retracted_at: null,
    },
  ]);
});
it("allows retraction but forbids changing wording or deleting history directly", async () => {
  await insert();
  await db.exec(
    `update artist_interview_boundaries set retracted_at=now() where id='${boundary}'`,
  );
  await assert.rejects(
    db.exec(`update artist_interview_boundaries set wording='changed'`),
    /permission denied/,
  );
  await assert.rejects(
    db.exec("delete from artist_interview_boundaries"),
    /permission denied/,
  );
});
it("bounds valid scope, origin and nonempty instruction fields", async () => {
  await assert.rejects(
    db.exec(
      `insert into artist_interview_boundaries(artist_id,request_id,wording,scope,sitting,origin_question_key,origin_question)values('${artist}','${boundary}',' ','forever',0,'key','q')`,
    ),
    /check constraint/,
  );
});
it("deduplicates the client request id within an artist", async () => {
  await insert();
  await assert.rejects(
    db.exec(
      `insert into artist_interview_boundaries(artist_id,request_id,wording,scope,sitting,origin_question_key,origin_question)values('${artist}','${boundary}','Other words','until_retracted',2,'key','q')`,
    ),
    /duplicate key/,
  );
});
it("denies both browser roles and enables RLS", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    await assert.rejects(
      db.exec("select * from artist_interview_boundaries"),
      /permission denied/,
    );
  }
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select relrowsecurity from pg_class where relname='artist_interview_boundaries'",
      )
    ).rows,
  ).toEqual([{ relrowsecurity: true }]);
});
it("purges private boundary history when the artist is deleted", async () => {
  await insert();
  await db.exec(`delete from artists where id='${artist}'`);
  expect(
    (
      await db.query(
        "select count(*)::int as n from artist_interview_boundaries",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
});
