/** @jest-environment node */
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const artist = "11111111-1111-4111-8111-111111111111";
const job = "22222222-2222-4222-8222-222222222222";
let db: InstanceType<typeof PGlite>;
const exec = (s: string) => db.exec(s);
beforeAll(async () => {
  db = new PGlite();
  await exec(`create role mnweb; create role anon; create role authenticated;
    create table artists(id uuid primary key);
    create table artist_research_jobs(id uuid primary key,artist_id uuid references artists(id),kind text,status text);
    grant usage on schema public to mnweb;
    insert into artists values('${artist}');
    insert into artist_research_jobs values('${job}','${artist}','question_research','done');`);
  await exec(readFileSync(resolve(process.cwd(), "drizzle/0044_question_answer_replay.sql"), "utf8"));
});
afterAll(async () => { await db?.close(); });
it("allows only the server role and protects the row with RLS", async () => {
  expect((await db.query("select relrowsecurity from pg_class where relname='artist_question_answers'")).rows[0]).toEqual({ relrowsecurity: true });
  for (const role of ["anon", "authenticated"]) {
    await exec(`set role ${role}`);
    await assert.rejects(exec("select * from artist_question_answers"), /permission denied/);
    await exec("reset role");
  }
  await exec("set role mnweb");
  await exec(`insert into artist_question_answers(job_id,artist_id,question_hash,status,claim_token,claim_until,expires_at)
    values('${job}','${artist}',repeat('a',64),'waiting',gen_random_uuid(),now(),now()+interval '24 hours')`);
  expect((await db.query<{ status: string }>("select status from artist_question_answers")).rows[0]?.status).toBe("waiting");
  await exec("reset role");
});
it("prevents a stale claimer from replacing a saved result", async () => {
  const [row] = (await db.query<{ claim_token: string }>("select claim_token from artist_question_answers")).rows;
  await exec(`update artist_question_answers set status='drafting',attempts=1 where job_id='${job}'`);
  await exec(`update artist_question_answers set status='verified',result='{"answer":"Checked"}'::jsonb where job_id='${job}'`);
  const changed = await db.query(`update artist_question_answers set status='failed',result=null
    where job_id='${job}' and claim_token='${row!.claim_token}' and status='drafting' returning job_id`);
  expect(changed.rows).toHaveLength(0);
  expect((await db.query<{ status: string }>("select status from artist_question_answers")).rows[0]?.status).toBe("verified");
});
it("cascades answer data with the research job", async () => {
  await exec(`delete from artist_research_jobs where id='${job}'`);
  expect((await db.query<{ n: number }>("select count(*)::int as n from artist_question_answers")).rows[0]?.n).toBe(0);
});
