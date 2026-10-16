/** @jest-environment node */
import { drizzle } from "drizzle-orm/pglite";
import { db } from "@/server/db/drizzle";
import { getDirectoryDiscoveryStatus } from "../getDirectoryDiscoveryStatus";
jest.mock("@/server/utils/queries/artistQueries", () => ({
  getArtistLinks: async () => [],
}));
jest.mock("@/server/utils/musicLinks/getConflictingMusicSourceIds", () => ({
  getConflictingMusicSourceIds: async () => [],
}));
jest.mock("@/server/utils/artistLinkReview/getHiddenLinkSourceIds", () => ({
  getHiddenLinkSourceIds: async () => [],
}));
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)(
  "@electric-sql/pglite",
) as typeof import("@electric-sql/pglite");
const client = new PGlite();
const database = drizzle(client);
const artist = "00000000-0000-4000-8000-000000000001",
  actor = "00000000-0000-4000-8000-000000000002",
  event = "00000000-0000-4000-8000-000000000003",
  other = "00000000-0000-4000-8000-000000000004";
const check = (viewer = actor) => getDirectoryDiscoveryStatus(artist, viewer);
beforeAll(
  async () =>
    client.exec(
      `create table artists(id uuid,added_by uuid,created_at timestamptz);create table users(id uuid,is_admin boolean);create table artist_claims(artist_id uuid);create table artist_activity_events(id uuid,artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text,parent_activity_id uuid);create table artist_research_jobs(artist_id uuid,activity_id uuid,kind text,status text,attempts int,state jsonb);`,
    ),
  30000,
);
afterAll(() => client.close());
beforeEach(async () => {
  db.execute = jest.fn(
    async (query) => (await database.execute(query)).rows,
  ) as never;
  db.query.artists.findFirst = jest
    .fn()
    .mockResolvedValue({ id: artist, deezer: "123" });
  db.query.artistVaultSources.findMany = jest.fn().mockResolvedValue([]);
  await client.exec(`truncate artists,users,artist_claims,artist_activity_events,artist_research_jobs;
    insert into artists values('${artist}','${actor}',now()); insert into users values('${actor}',false),('${other}',false);
    insert into artist_activity_events values('${event}','${artist}','${actor}','user','directory_add','directory_add',null);
    insert into artist_research_jobs values('${artist}','${event}','source_search','pending',0,'{"claimId":null,"purpose":"directory_preparation","creationActivityId":"${event}"}');`);
});
it("allows the actual adder/admin, but rejects another regular account", async () => {
  expect(await check()).toMatchObject({ state: "active" });
  expect(await check(other)).toBeNull();
  await client.exec(`update users set is_admin=true where id='${other}'`);
  expect(await check(other)).toMatchObject({ state: "active" });
});
it("does not complete source_search while downstream social work is queued", async () => {
  await client.exec(
    `update artist_research_jobs set status='done';insert into artist_research_jobs values('${artist}',null,'social_ingest','pending',0,'{"directoryActivityId":"${event}"}');`,
  );
  expect(await check()).toMatchObject({ state: "active" });
  await client.exec(`update artist_research_jobs set status='done'`);
  expect(await check()).toMatchObject({ state: "active" });
  await client.exec(
    `insert into artist_research_jobs values('${artist}',null,'caption_extract','done',0,'{"directoryActivityId":"${event}"}');`,
  );
  expect(await check()).toMatchObject({ state: "complete" });
});
it("distinguishes failure and claim cancellation from completion", async () => {
  await client.exec(
    `update artist_research_jobs set status='failed',attempts=4`,
  );
  expect(await check()).toMatchObject({ state: "failed" });
  await client.exec(`insert into artist_claims values('${artist}')`);
  expect(await check()).toMatchObject({ state: "stopped" });
});
it("rejects stale, mismatched and absent creation lineage", async () => {
  await client.exec(`update artists set created_at=now()-interval '25 hours'`);
  expect(await check()).toBeNull();
  await client.exec(
    `update artists set created_at=now();update artist_activity_events set actor_user_id='${other}'`,
  );
  expect(await check()).toBeNull();
  await client.exec(`delete from artist_research_jobs`);
  expect(await check()).toBeNull();
});
it("includes child-activity jobs but ignores unrelated questions", async () => {
  await client.exec(
    `update artist_research_jobs set status='done';insert into artist_activity_events values('${other}','${artist}','${actor}','user','social_ingest','directory_add','${event}');insert into artist_research_jobs values('${artist}','${other}','caption_extract','pending',0,'{}');`,
  );
  expect(await check()).toMatchObject({ state: "active" });
  await client.exec(
    `update artist_research_jobs set status='done';insert into artist_research_jobs values('${artist}',null,'question_research','pending',0,'{}');`,
  );
  expect(await check()).toMatchObject({ state: "complete" });
});
it("keeps observing a pending Spotify match and includes its final link", async () => {
  await client.exec(`update artist_research_jobs set status='done';
    insert into artist_research_jobs values('${artist}','${event}','spotify_match','pending',0,'{"directoryActivityId":"${event}"}');`);
  expect(await check()).toMatchObject({ state: "active" });
  const before = await check();
  await client.exec(`update artist_research_jobs set status='done' where kind='spotify_match'`);
  db.query.artists.findFirst = jest.fn().mockResolvedValue({ id: artist, deezer: "123", spotify: "4ug6fLrAtZwptxMzS1ey1r" });
  const after = await check();
  expect(after).toMatchObject({ state: "complete" });
  expect(after?.revision).not.toBe(before?.revision);
});
