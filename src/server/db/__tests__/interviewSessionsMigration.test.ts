/** @jest-environment node */
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
let db: InstanceType<typeof PGlite>;
const a = "11111111-1111-4111-8111-111111111111",
  s = "22222222-2222-4222-8222-222222222222",
  q = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role mnweb;create role anon;create role authenticated;create function uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';create table artists(id uuid primary key);create table users(id uuid primary key);create table artist_interview_answers(id uuid primary key);insert into artists values('${a}');insert into artist_interview_answers values('${q}');grant usage on schema public to mnweb;`,
  );
  await db.exec(
    readFileSync(
      resolve(process.cwd(), "drizzle/0042_interview_sessions.sql"),
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(
    "reset role;delete from artist_interview_question_evidence;delete from artist_interview_sessions;set role mnweb;",
  );
  await db.exec(
    `insert into artist_interview_sessions(id,artist_id,request_id,sitting)values('${s}','${a}','${s}',1);`,
  );
});
it("permits one active sitting and one evidence record for each offer", async () => {
  await expect(
    db.exec(
      `insert into artist_interview_sessions(artist_id,request_id,sitting)values('${a}','${q}',2)`,
    ),
  ).rejects.toThrow(/unique|duplicate/);
  await db.exec(
    `insert into artist_interview_question_evidence(answer_id,artist_id,session_id,ordinal,memory_snapshot_id,evidence_references)values('${q}','${a}','${s}',1,'${"a".repeat(64)}','[{}]')`,
  );
  await expect(
    db.exec(
      `insert into artist_interview_question_evidence(answer_id,artist_id,session_id,ordinal,memory_snapshot_id,evidence_references)values('${q}','${a}','${s}',1,'${"a".repeat(64)}','[{}]')`,
    ),
  ).rejects.toThrow(/unique|duplicate/);
});
it("allows session closure but forbids rewriting identity, sitting or evidence", async () => {
  await db.exec(
    `update artist_interview_sessions set state='finished',closed_at=now() where id='${s}'`,
  );
  await expect(
    db.exec(`update artist_interview_sessions set sitting=9`),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.exec("delete from artist_interview_sessions"),
  ).rejects.toThrow(/permission denied/);
  await expect(
    db.exec(
      "update artist_interview_question_evidence set evidence_references='[]'",
    ),
  ).rejects.toThrow(/permission denied/);
});
it("rejects inconsistent session closure and invalid ordinals", async () => {
  await expect(
    db.exec("update artist_interview_sessions set state='finished'"),
  ).rejects.toThrow(/check constraint/);
  await expect(
    db.exec(
      `insert into artist_interview_question_evidence(answer_id,artist_id,session_id,ordinal,memory_snapshot_id,evidence_references)values('${q}','${a}','${s}',4,'${"a".repeat(64)}','[{}]')`,
    ),
  ).rejects.toThrow(/check constraint/);
});
it("denies browser roles and enables RLS on both private tables", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    for (const table of [
      "artist_interview_sessions",
      "artist_interview_question_evidence",
    ])
      await expect(db.exec(`select * from ${table}`)).rejects.toThrow(
        /permission denied/,
      );
  }
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select relrowsecurity from pg_class where relname in ('artist_interview_sessions','artist_interview_question_evidence')",
      )
    ).rows,
  ).toEqual([{ relrowsecurity: true }, { relrowsecurity: true }]);
});
