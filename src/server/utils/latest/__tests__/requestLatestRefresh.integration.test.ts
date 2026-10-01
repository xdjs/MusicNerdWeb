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
jest.mock("@/env", () => ({ ...jest.requireActual("@/env"), APIFY_API_TOKEN: "test" }));
jest.mock("../../socialIngest", () => ({ checkInstagramScrape: jest.fn(), collectInstagramScrape: jest.fn() }));
jest.mock("../startLatestInstagramScrape", () => ({ startLatestInstagramScrape: jest.fn() }));
const client = new PGlite();
const driver = drizzle(client, { schema });
const database = {
  ...driver,
  insert: driver.insert.bind(driver),
  execute: async (query: Parameters<typeof driver.execute>[0]) =>
    (await driver.execute(query)).rows,
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
let enqueue: typeof import("../../queries/researchJobQueries").enqueueResearchJob;
let authorize: typeof import("../authorizeLatestRefresh").authorizeLatestRefresh;
let store: typeof import("../latestRefreshStore").latestRefreshStore;
let read: typeof import("../getLatestRefresh").getLatestRefresh;
let context: typeof import("../../artistOperationContext").withArtistOperation;
beforeAll(async () => {
  jest.resetModules();
  ({ enqueueResearchJob: enqueue } = await import("../../queries/researchJobQueries"));
  ({ authorizeLatestRefresh: authorize } = await import("../authorizeLatestRefresh"));
  ({ latestRefreshStore: store } = await import("../latestRefreshStore"));
  ({ getLatestRefresh: read } = await import("../getLatestRefresh"));
  ({ requestLatestRefresh: request } = await import("../requestLatestRefresh"));
  ({ withArtistOperation: context } =
    await import("../../artistOperationContext"));
  await client.exec(`
 CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
 create table artists(id uuid primary key,instagram text,inprocess text,spotify text,deezer text);
 create table users(id uuid primary key,is_admin boolean);
 create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text,reference_code text,created_at timestamptz,updated_at timestamptz);
 create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
 create table artist_research_jobs(id uuid primary key default gen_random_uuid(),artist_id uuid,kind text constraint artist_research_jobs_kind_check check(kind in ('social_ingest','caption_extract','lore_refresh','source_search')),status text default 'pending',cursor integer default 0,total integer,claimed_at timestamptz,attempts integer default 0,last_error text,state jsonb,activity_id uuid,created_at timestamptz default now(),updated_at timestamptz default now());
 create unique index jobs_live on artist_research_jobs(artist_id,kind) where status in ('pending','running');
 insert into artists values('${artist}','artist',null,null,null);
 insert into users values('${user}',false);
 insert into artist_claims(id,artist_id,user_id,status)values('${claim}','${artist}','${user}','approved');
 `);
  await client.exec(readFileSync("drizzle/0034_latest_refresh.sql", "utf8"));
}, 30000);
beforeEach(async () => {
  await client.exec(`delete from artist_research_jobs; delete from artist_activity_events;
    update artists set instagram='artist',inprocess=null,spotify=null,deezer=null;
    update artist_claims set status='approved'; update users set is_admin=false;`);
});
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

it.each(["instagram", "inprocess", "spotify", "deezer"] as const)(
  "rejects progress for a changed %s identity and permits a fresh request",
  async (source) => {
    const id = await call();
    await client.exec(
      `update artist_research_jobs set status='running'; update artists set ${source}='replacement'`,
    );
    const {
      rows: [saved],
    } = await client.query<{
      state: import("@/lib/latest/types").LatestRefreshState;
    }>("select state from artist_research_jobs");
    const job = {
      id,
      artistId: artist,
    } as import("../../queries/researchJobQueries").ResearchJob;
    await expect(store(job, saved.state, true)).rejects.toThrow(
      "ownership changed",
    );
    expect(await read(artist)).toBeNull();
    const replacement = await call();
    expect(replacement).not.toBe(id);
    expect(
      (
        await client.query(
          "select status from artist_research_jobs where id=$1",
          [id],
        )
      ).rows,
    ).toEqual([{ status: "failed" }]);
    expect((await read(artist))?.id).toBe(replacement);
  },
);
it("rejects progress after claim revocation and releases the cooldown for an admin", async () => {
  const id = await call();
  await client.exec(
    "update artist_research_jobs set status='running'; update artist_claims set status='revoked'",
  );
  const {
    rows: [saved],
  } = await client.query<{
    state: import("@/lib/latest/types").LatestRefreshState;
  }>("select state from artist_research_jobs");
  await expect(
    store(
      {
        id,
        artistId: artist,
      } as import("../../queries/researchJobQueries").ResearchJob,
      saved.state,
      true,
    ),
  ).rejects.toThrow("ownership changed");
  expect(await read(artist)).toBeNull();
  await client.exec("update users set is_admin=true");
  expect(
    await context(
      artist,
      { userId: user, expectedClaimId: null, trigger: "manual_latest_refresh" },
      () => request(artist),
    ),
  ).not.toBe(id);
});
it("saves valid progress and retains its cooldown", async () => {
  const id = await call();
  await client.exec("update artist_research_jobs set status='running'");
  const {
    rows: [saved],
  } = await client.query<{
    state: import("@/lib/latest/types").LatestRefreshState;
  }>("select state from artist_research_jobs");
  await store(
    {
      id,
      artistId: artist,
    } as import("../../queries/researchJobQueries").ResearchJob,
    saved.state,
    true,
  );
  expect((await read(artist))?.status).toBe("done");
  expect(await call()).toBe(id);
});

it("invalidates completed results when their initiating admin loses access", async () => {
  await client.exec(
    "update artist_claims set status='revoked'; update users set is_admin=true",
  );
  const id = await context(
    artist,
    { userId: user, expectedClaimId: null, trigger: "manual_latest_refresh" },
    () => request(artist),
  );
  await client.exec("update artist_research_jobs set status='done'");
  expect((await read(artist))?.id).toBe(id);
  await client.exec("update users set is_admin=false");
  expect(await read(artist)).toBeNull();
});

it("treats a changed connection before the next worker slice as terminal cancellation", async () => {
  const id = await call();
  const { rows: [saved] } = await client.query<{ state: import("@/lib/latest/types").LatestRefreshState; activity_id: string }>("select state,activity_id from artist_research_jobs");
  await client.exec("update artists set instagram='replacement'");
  const job = { id, artistId: artist, activityId: saved.activity_id, state: saved.state } as unknown as import("../../queries/researchJobQueries").ResearchJob;
  await expect(authorize(job)).rejects.toThrow("ownership changed");
});

it("does not queue a second paid social ingest behind an active Latest check", async () => {
  await call();
  expect(await enqueue(artist, "social_ingest", { state: { force: true } })).toBe(false);
  expect((await client.query("select kind from artist_research_jobs")).rows).toEqual([{ kind: "latest_refresh" }]);
});
it("keeps the existing research owner when social ingest queues first", async () => {
  expect(await enqueue(artist, "social_ingest")).toBe(true);
  await call();
  expect((await read(artist))?.sources.instagram?.status).toBe("failed");
});
it("serializes simultaneous Latest and unscoped research requests", async () => {
  await Promise.all([call(), enqueue(artist, "social_ingest", { state: { force: true } })]);
  const { rows } = await client.query("select kind from artist_research_jobs where kind='social_ingest' or state->'sources'->'instagram'->>'status'='pending'");
  expect(rows).toHaveLength(1);
});
it("allows research after Latest has completed", async () => {
  await call();
  await client.exec("update artist_research_jobs set status='done'");
  expect(await enqueue(artist, "social_ingest", { state: { force: true } })).toBe(true);
});

it("persists status failures and exhausts four retries on the same paid run", async () => {
  const {refreshLatestInstagram}=await import("../refreshLatestInstagram");
  const {claimResearchJob,failResearchJob}=await import("../../queries/researchJobQueries");
  const {checkInstagramScrape}=await import("../../socialIngest");
  const {startLatestInstagramScrape}=await import("../startLatestInstagramScrape");
  jest.mocked(checkInstagramScrape).mockResolvedValue({status:"failed",reason:"apify status 503",retryable:true});
  await call();
  await client.exec(`update artist_research_jobs set state=state || '{"providerStarted":true,"runId":"paid-run"}'::jsonb`);
  for(let attempt=1;attempt<=4;attempt++){
    const job=await claimResearchJob({artistId:artist,kinds:["latest_refresh"]});
    expect(job).not.toBeNull();
    await expect(refreshLatestInstagram(job!,Date.now()+55000)).rejects.toThrow("apify status 503");
    await failResearchJob(job!.id,"apify status 503");
    const rows=await client.query("select status,attempts,last_error,state from artist_research_jobs");
    expect(rows.rows[0]).toMatchObject({attempts:attempt,status:attempt===4?"failed":"pending",last_error:"apify status 503",state:{runId:"paid-run",instagramFailure:{phase:"status",reason:"apify status 503"}}});
  }
  expect(await claimResearchJob({artistId:artist,kinds:["latest_refresh"]})).toBeNull();
  expect(startLatestInstagramScrape).not.toHaveBeenCalled();
  const view=await read(artist);
  expect(view?.sources.instagram?.status).toBe("failed");
  expect(JSON.stringify(view)).not.toMatch(/paid-run|apify|instagramFailure/);
});

it("resets failures on a recovered poll but never resets failed cached collection", async () => {
  const {refreshLatestInstagram}=await import("../refreshLatestInstagram");
  const {claimResearchJob,failResearchJob}=await import("../../queries/researchJobQueries");
  const {checkInstagramScrape,collectInstagramScrape}=await import("../../socialIngest");
  jest.mocked(checkInstagramScrape).mockReset();
  jest.mocked(checkInstagramScrape).mockResolvedValueOnce({status:"running",runId:"paid-run"})
    .mockResolvedValueOnce({status:"ready",runId:"paid-run",datasetId:"dataset"});
  jest.mocked(collectInstagramScrape).mockResolvedValue(null);
  await call();
  await client.exec(`update artist_research_jobs set attempts=3,state=state || '{"providerStarted":true,"runId":"paid-run"}'::jsonb`);
  const recovered=await claimResearchJob({artistId:artist,kinds:["latest_refresh"]});
  expect(await refreshLatestInstagram(recovered!,Date.now()+55000)).toEqual({status:"pending"});
  await store(recovered!,recovered!.state as unknown as import("@/lib/latest/types").LatestRefreshState,false);
  expect((await client.query("select attempts from artist_research_jobs")).rows).toEqual([{attempts:0}]);
  for(let attempt=1;attempt<=4;attempt++){
    const job=await claimResearchJob({artistId:artist,kinds:["latest_refresh"]});
    await expect(refreshLatestInstagram(job!,Date.now()+55000)).rejects.toThrow("Instagram collection unavailable");
    await failResearchJob(job!.id,"Instagram collection unavailable");
    expect((await client.query("select attempts,status from artist_research_jobs")).rows).toEqual([{attempts:attempt,status:attempt===4?"failed":"pending"}]);
  }
  expect(checkInstagramScrape).toHaveBeenCalledTimes(2);
});
