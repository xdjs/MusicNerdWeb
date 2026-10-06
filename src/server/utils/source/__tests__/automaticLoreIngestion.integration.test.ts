/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
import { queueApprovedSourceExtraction } from '../queueApprovedSourceExtraction';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, { schema });
const database = {
  ...driver,
  transaction: (fn: (tx: unknown) => Promise<unknown>) => driver.transaction(tx => fn({
    ...tx, query: tx.query, insert: tx.insert.bind(tx), update: tx.update.bind(tx),
    execute: async (q: Parameters<typeof tx.execute>[0]) => (await tx.execute(q)).rows,
  })),
};
const artist = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const contributor = '00000000-0000-4000-8000-000000000003';
const claim = '00000000-0000-4000-8000-000000000004';
let withArtistOperation: typeof import('@/server/utils/artistOperationContext').withArtistOperation;
let add: typeof import('../../queries/insertVaultSource').insertVaultSource;
let review: typeof import('../../queries/updateVaultSourceStatus').updateVaultSourceStatus;
let approve: typeof import('../../contributions/approvePendingLoreSource').approvePendingLoreSource;
beforeAll(async () => {
  jest.resetModules();
  ({ withArtistOperation } = await import('@/server/utils/artistOperationContext'));
  ({ insertVaultSource: add } = await import('../../queries/insertVaultSource'));
  ({ updateVaultSourceStatus: review } = await import('../../queries/updateVaultSourceStatus'));
  ({ approvePendingLoreSource: approve } = await import('../../contributions/approvePendingLoreSource'));
  await client.exec(`
    CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
    create table artists(id uuid primary key);
    create table users(id uuid primary key,is_admin boolean,is_white_listed boolean);
    create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text,reference_code text,created_at timestamptz,updated_at timestamptz);
    create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
    create table artist_vault_sources(id uuid primary key default gen_random_uuid(),artist_id uuid,status text,title text,url text,created_at timestamptz default now(),updated_at timestamptz default now(),snippet text,type text,file_name text,file_size integer,file_path text,content_type text,extracted_text text,og_image text,published_at date,podcast_episode_key text,podcast_show_title text,podcast_episode_title text,origin text,activity_id uuid);
    create unique index sources_unique on artist_vault_sources(artist_id,url);
    create table artist_research_jobs(id uuid primary key default gen_random_uuid(),artist_id uuid,kind text,status text default 'pending' constraint artist_research_jobs_status_check check(status in ('pending','running','done','failed')),cursor integer default 0,total integer,state jsonb,activity_id uuid,claimed_at timestamptz,attempts integer default 0,last_error text,created_at timestamptz default now(),updated_at timestamptz default now());
    create unique index artist_research_jobs_one_live on artist_research_jobs(artist_id,kind) where status in ('pending','running');
    insert into artists values('${artist}');
    insert into users values('${admin}',true,false),('${contributor}',false,true);
    insert into artist_claims(id,artist_id,user_id,status)values('${claim}','${artist}','${admin}','approved');
  `);
  await client.exec(readFileSync('drizzle/0038_automatic_source_extraction.sql', 'utf8'));
}, 30000);
afterAll(async () => client.close());
beforeEach(async () => {
  await client.exec('truncate artist_vault_sources,artist_research_jobs,artist_activity_events');
});
const jobs = async () => (await client.query<{state: Record<string, unknown>;activity_id:string;status:string}>('select state,activity_id,status from artist_research_jobs order by created_at')).rows;
const insert = (url: string, extra = {}) => add({ artistId: artist, url, status: 'approved', ...extra }, undefined, { userId: contributor, trigger: 'visitor_suggestion', approveIfTrusted: true });

it('atomically queues a trusted non-owner addition and retains its real activity', async () => {
  const source = (await insert('https://example.test/interview'))!;
  expect(await jobs()).toEqual([{ status: 'queued',activity_id:source.activityId,state:{version:2,autoSourceId:source.id,expectedClaimId:claim,sources:[{id:source.id,url:source.url}],outcomes:[]} }]);
  expect((await client.query('select actor_user_id from artist_activity_events')).rows).toEqual([{ actor_user_id: contributor }]);
});
it('does not lose the twenty-first source while another extraction is running', async () => {
  await insert('https://example.test/first');
  await client.exec("update artist_research_jobs set status='running'");
  for (let n=0;n<24;n++) await insert(`https://example.test/${n}`);
  expect(await jobs()).toHaveLength(25);
});
it('deduplicates concurrent canonical additions and repeated approval', async () => {
  const sources = await Promise.all(['','#fragment'].map(fragment=>insert(`https://example.test/duplicate${fragment}`)));
  const source = sources.find(Boolean)!;
  await withArtistOperation(artist,{userId:admin,expectedClaimId:claim},()=>review(source.id,'approved'));
  expect(sources.filter(Boolean)).toHaveLength(1);
  expect(await jobs()).toHaveLength(1);
});
it('excludes pending, rejected, private uploads and existing originals', async () => {
  await add({artistId:artist,url:'https://example.test/pending',status:'pending'});
  await add({artistId:artist,url:'https://example.test/rejected',status:'rejected'});
  await insert('https://example.test/upload',{filePath:'private.pdf'});
  await insert('https://example.test/stored',{extractedText:'Original words'});
  expect(await jobs()).toEqual([]);
});
it('queues individual and bulk approval with approval attribution', async () => {
  const one = (await add({artistId:artist,url:'https://example.test/one'}))!;
  const two = (await add({artistId:artist,url:'https://example.test/two'}))!;
  await withArtistOperation(artist,{userId:admin,expectedClaimId:claim},()=>review(one.id,'approved','pending'));
  await approve(admin,two.id);
  expect(await jobs()).toHaveLength(2);
  expect((await client.query("select e.action,e.actor_user_id from artist_research_jobs j join artist_activity_events e on e.id=j.activity_id")).rows).toEqual([{action:'source_approved',actor_user_id:admin},{action:'source_approved',actor_user_id:admin}]);
  expect(await approve(admin,two.id)).toBeNull();
  expect(await jobs()).toHaveLength(2);
});
it('rolls back additions and approvals when the durable queue cannot be written', async () => {
  const source = (await add({artistId:artist,url:'https://example.test/pending'}))!;
  await client.exec("alter table artist_research_jobs add constraint break_queue check(kind <> 'source_extract')");
  try {
    await expect(insert('https://example.test/rollback')).rejects.toThrow();
    await expect(approve(admin,source.id)).rejects.toThrow();
    expect((await client.query('select url,status from artist_vault_sources')).rows).toEqual([{url:source.url,status:'pending'}]);
    expect((await client.query('select action from artist_activity_events')).rows).toEqual([{action:'source_added'}]);
  } finally { await client.exec('alter table artist_research_jobs drop constraint break_queue'); }
});
it('keeps one-live-job protection for all legacy and explicit extraction jobs', async () => {
  for (const kind of ['lore_refresh','source_search','social_ingest','caption_extract','latest_refresh','source_extract']) {
    await client.query("insert into artist_research_jobs(artist_id,kind,state)values($1,$2,'{}')",[artist,kind]);
    await expect(client.query("insert into artist_research_jobs(artist_id,kind,state)values($1,$2,'{}')",[artist,kind])).rejects.toThrow(/duplicate key/);
  }
  await insert('https://example.test/alongside-manual');
  expect(await jobs()).toHaveLength(7);
});
it('replaces a stale-generation automatic job without changing its attribution', async () => {
  const source = (await insert('https://example.test/stale'))!;
  await client.exec("update artist_research_jobs set state=jsonb_set(state,'{expectedClaimId}','null')");
  await driver.transaction(async tx => {
    const writer = { execute: async (q: Parameters<typeof tx.execute>[0]) => (await tx.execute(q)).rows };
    await queueApprovedSourceExtraction(writer as Parameters<typeof queueApprovedSourceExtraction>[0],source,source.activityId);
  });
  expect((await jobs()).map(j=>j.status).sort()).toEqual(['done','queued']);
});
