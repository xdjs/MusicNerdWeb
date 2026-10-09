/** @jest-environment node */
import { drizzle } from "drizzle-orm/pglite";
let reserveQuestionPlanning: typeof import("../reserveQuestionPlanning").reserveQuestionPlanning;
jest.mock("@/server/db/drizzle", () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
const client = new PGlite();
const driver = drizzle(client);
const database = { transaction: (fn: (tx: unknown) => Promise<unknown>) => driver.transaction(tx => fn({
  execute: async (query: Parameters<typeof tx.execute>[0]) => (await tx.execute(query)).rows,
})) };
const artist = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const third = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  jest.resetModules();
  ({ reserveQuestionPlanning } = await import("../reserveQuestionPlanning"));
  await client.exec(`create table artists(id uuid primary key);insert into artists values('${artist}'),('${other}'),('${third}');
    create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid references artists(id),actor_user_id uuid,actor_kind text,action text,trigger text,created_at timestamptz default now());`);

}, 30000);
beforeEach(async () => { await client.exec("delete from artist_activity_events"); });
afterAll(async () => { await client.close(); });
async function seed(n: number, id = artist) {
  await client.query("insert into artist_activity_events(artist_id,actor_kind,action,trigger) select $1::uuid,'system','question_plan','ask_about_budget' from generate_series(1,$2::int)", [id, n]);
}
it("reserves an anonymous system operation without storing any question or visitor content", async () => {
  await reserveQuestionPlanning(artist);
  const { rows } = await client.query("select artist_id,actor_user_id,actor_kind,action,trigger from artist_activity_events");
  expect(rows).toEqual([{ artist_id: artist, actor_user_id: null, actor_kind: "system", action: "question_plan", trigger: "ask_about_budget" }]);
});
it("allows only one concurrent reservation in the artist's final slot", async () => {
  await seed(9);
  const outcomes = await Promise.allSettled([reserveQuestionPlanning(artist), reserveQuestionPlanning(artist)]);
  expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find(result => result.status === "rejected")).toMatchObject({ reason: { status: 429, code: "question_planning_quota" } });
  expect((await client.query<{ n: number }>("select count(*)::int n from artist_activity_events")).rows[0].n).toBe(10);
});
it("enforces the global final slot across different artists", async () => {
  await seed(199, other);
  const outcomes = await Promise.allSettled([reserveQuestionPlanning(artist), reserveQuestionPlanning(third)]);
  expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(outcomes.find(result => result.status === "rejected")).toMatchObject({ reason: { code: "question_planning_quota" } });
  expect((await client.query<{ n: number }>("select count(*)::int n from artist_activity_events")).rows[0].n).toBe(200);
});
it("excludes expired reservations and unrelated contribution activity", async () => {
  await seed(10);
  await client.exec("update artist_activity_events set created_at=now()-interval '25 hours';insert into artist_activity_events(artist_id,actor_kind,action,trigger) select artist_id,'user','source_added','editor_source' from artist_activity_events");
  await expect(reserveQuestionPlanning(artist)).resolves.toBeUndefined();
});
