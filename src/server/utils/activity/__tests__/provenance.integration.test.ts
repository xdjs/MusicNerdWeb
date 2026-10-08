/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
const artist = '00000000-0000-4000-8000-000000000001';
const user = '00000000-0000-4000-8000-000000000002';
const source = '00000000-0000-4000-8000-000000000003';
let record: typeof import('../recordArtistActivity').recordArtistActivity;
let queue: typeof import('../../queries/getPendingLoreSources').getPendingLoreSources;
let activity: typeof import('../getArtistActivity').getArtistActivity;
beforeAll(async () => {
  jest.resetModules();
  ({ recordArtistActivity: record } = await import('../recordArtistActivity'));
  ({ getPendingLoreSources: queue } = await import('../../queries/getPendingLoreSources'));
  ({ getArtistActivity: activity } = await import('../getArtistActivity'));
  await client.exec(`
    create role mnweb; create role anon; create role authenticated;
    CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';
    create table users (id uuid primary key, username text, email text);
    create table artists (id uuid primary key, name text);
    create table artist_claims (id uuid primary key, artist_id uuid, user_id uuid, status text, reference_code text, created_at timestamptz default now(), updated_at timestamptz default now());
    create table artist_research_jobs (id uuid primary key default gen_random_uuid(), artist_id uuid, kind text constraint artist_research_jobs_kind_check check (kind in ('social_ingest', 'caption_extract', 'lore_refresh')), status text default 'pending', cursor integer default 0, total integer, attempts integer default 0, state jsonb default '{}', claimed_at timestamptz, last_error text, created_at timestamptz default now(), updated_at timestamptz default now());
    create unique index artist_research_jobs_one_live on artist_research_jobs (artist_id, kind) where status in ('pending', 'running');
    create table artist_vault_sources (id uuid primary key default gen_random_uuid(), artist_id uuid, status text, title text, url text, created_at timestamptz default now(), updated_at timestamptz default now(), snippet text, type text, file_name text, file_size integer, file_path text, content_type text, extracted_text text, og_image text, published_at date, podcast_episode_key text, podcast_show_title text, podcast_episode_title text);
    create unique index sources_unique on artist_vault_sources (artist_id, url);
    insert into artists values ('${artist}', 'Example Artist');
    insert into users values ('${user}', 'contributor', 'contributor@example.test');
    insert into artist_vault_sources (id, artist_id, status, title, url) values ('${source}', '${artist}', 'pending', 'Legacy source', 'https://example.test/legacy');
  `);
  // Staging grants mnweb CRUD by default; the audit migration must narrow that
  // inherited grant as well as deny the public Data API roles.
  await client.exec('alter default privileges in schema public grant select, insert, update, delete on tables to mnweb, anon, authenticated');
  await client.exec(readFileSync('drizzle/0031_lore_attribution.sql', 'utf8'));
  await client.exec("alter table artist_research_jobs add constraint artist_research_jobs_status_check check(status in ('pending','running','done','failed'))");
  await client.exec(readFileSync('drizzle/0037_source_extract.sql', 'utf8'));
  await client.exec(readFileSync('drizzle/0038_automatic_source_extraction.sql', 'utf8'));
}, 30000);
afterAll(async () => { await client.close(); });
it('leaves legacy origins unknown and creates no guessed actor', async () => {
  const result = await queue();
  expect(result.items[0]).toMatchObject({ origin: 'unknown', actorId: null, activityId: null, claimed: false });
});
it('joins a real initiator, combines origin/claim/contributor filters, and escapes wildcard search', async () => {
  const event = await record(artist, 'source_search', { userId: user, trigger: 'editor_search' });
  await client.query('update artist_vault_sources set origin = $1, activity_id = $2 where id = $3', ['research', event, source]);
  expect((await queue({ query: 'contributor', origin: 'research', claim: 'unclaimed' })).items[0]).toMatchObject({ actorId: user, actorName: 'contributor', origin: 'research' });
  expect((await queue({ origin: 'submission' })).total).toBe(0);
  expect((await queue({ claim: 'claimed' })).total).toBe(0);
  expect((await queue({ query: '%' })).total).toBe(0);
  expect((await activity({ query: user, action: 'source_search' })).items[0]).toMatchObject({ id: event, trigger: 'editor_search' });
});
it('permits mnweb append/read but rejects update/delete and browser-role reads', async () => {
  await client.exec('set role mnweb');
  try {
    await expect(client.query('select id from artist_activity_events')).resolves.toBeDefined();
    await expect(client.query(`insert into artist_activity_events (artist_id, actor_kind, action, trigger) values ($1, 'system', 'source_search', 'maintenance') returning id`, [artist])).resolves.toBeDefined();
    await expect(client.query('update artist_activity_events set trigger = $1', ['forged'])).rejects.toThrow(/permission denied/);
    await expect(client.query('delete from artist_activity_events')).rejects.toThrow(/permission denied/);
  } finally { await client.exec('reset role'); }
  for (const role of ['anon', 'authenticated']) {
    await client.exec(`set role ${role}`);
    try { await expect(client.query('select * from artist_activity_events')).rejects.toThrow(/permission denied/); }
    finally { await client.exec('reset role'); }
  }
});
it('persists authenticated submissions and does not reattribute duplicate URLs', async () => {
  const { insertVaultSource } = await import('../../queries/insertVaultSource');
  const first = await insertVaultSource({ artistId: artist, url: 'https://example.test/submission', status: 'pending' }, undefined, { userId: user, trigger: 'visitor_suggestion' });
  expect(first).toMatchObject({ origin: 'submission' });
  expect(first?.activityId).toBeTruthy();
  const duplicate = await insertVaultSource({ artistId: artist, url: 'https://example.test/submission#fragment', status: 'pending' });
  expect(duplicate).toBeUndefined();
  const result = await queue({ origin: 'submission' });
  expect(result.items[0]).toMatchObject({ actorId: user, activityId: first?.activityId });
});
it('does not classify an unattributed file import as a user submission', async () => {
  const { insertVaultSource } = await import('../../queries/insertVaultSource');
  const row = await insertVaultSource({ artistId: artist, url: 'https://example.test/import', filePath: 'legacy.pdf', status: 'pending' });
  expect(row).toMatchObject({ origin: 'unknown' });
});
it('retains the initiating user through child jobs and progress-state replacement', async () => {
  const { withArtistOperation } = await import('../../artistOperationContext');
  const { enqueueResearchJob, saveJobState } = await import('../../queries/researchJobQueries');
  const claimId = '00000000-0000-4000-8000-000000000004';
  await client.query("insert into artist_claims (id, artist_id, user_id, status) values ($1, $2, $3, 'approved')", [claimId, artist, user]);
  await withArtistOperation(artist, { userId: user, expectedClaimId: claimId, trigger: 'onboarding' }, () => enqueueResearchJob(artist, 'social_ingest'));
  const root = (await database.select().from(schema.artistResearchJobs))[0]!;
  expect(root.activityId).toBeTruthy();
  await saveJobState(root.id, { cursor: 'new progress, no actor fields' });
  await enqueueResearchJob(artist, 'caption_extract', { parentJobId: root.id });
  const jobs = await database.select().from(schema.artistResearchJobs);
  expect(jobs).toHaveLength(2);
  expect(jobs.every(job => job.activityId === root.activityId)).toBe(true);
  const event = await activity({ eventId: root.activityId! });
  expect(event.items[0]).toMatchObject({ actorId: user, trigger: 'onboarding' });
});
it('records every accepted coalesced Lore request without replacing the running initiator', async () => {
  const { queueLoreRefresh } = await import('../../queries/loreRefresh');
  const claimId = '00000000-0000-4000-8000-000000000004';
  await queueLoreRefresh(artist, claimId, { userId: user, trigger: 'source_change' });
  const before = (await activity({ action: 'lore_refresh' })).total;
  const root = (await database.select().from(schema.artistResearchJobs)).find(job => job.kind === 'lore_refresh')!;
  await queueLoreRefresh(artist, claimId, { userId: user, trigger: 'upload' });
  expect((await activity({ action: 'lore_refresh' })).total).toBe(before + 1);
  expect((await database.select().from(schema.artistResearchJobs)).find(job => job.kind === 'lore_refresh')?.activityId).toBe(root.activityId);
});
it('records source review in its write transaction without changing original provenance', async () => {
  const { withArtistOperation } = await import('../../artistOperationContext');
  const { updateVaultSourceStatus } = await import('../../queries/dashboardQueries');
  const claimId = '00000000-0000-4000-8000-000000000004';
  await withArtistOperation(artist, { userId: user, expectedClaimId: claimId, trigger: 'source_review' }, () => updateVaultSourceStatus(source, 'approved', 'pending'));
  const events = await activity({ action: 'source_approved' });
  expect(events.items[0]).toMatchObject({ sourceId: source, actorId: user, trigger: 'source_review' });
  await client.query("update artist_vault_sources set status = 'pending' where id = $1", [source]);
  expect((await queue({ origin: 'research' })).items[0]).toMatchObject({ actorId: user, origin: 'research', trigger: 'editor_search' });
});
it('accepts durable source searches after upgrading the existing job-kind constraint', async () => {
  const { enqueueResearchJob } = await import('../../queries/researchJobQueries');
  await enqueueResearchJob(artist, 'source_search');
  expect((await database.select().from(schema.artistResearchJobs)).some(job => job.kind === 'source_search')).toBe(true);
});
it('records only the winning canonical source addition and links the event to that source', async () => {
  const { insertVaultSource } = await import('../../queries/insertVaultSource');
  const before = (await activity({ action: 'source_submission' })).total;
  const results = await Promise.all(['', '#duplicate'].map(fragment => insertVaultSource({
    artistId: artist, url: `https://example.test/concurrent${fragment}`, status: 'pending',
  }, undefined, { userId: user, trigger: 'visitor_suggestion' })));
  const added = results.filter(Boolean);
  expect(added).toHaveLength(1);
  const events = await activity({ action: 'source_submission' });
  expect(events.total).toBe(before + 1);
  expect((await activity({ eventId: added[0]!.activityId! })).items[0]).toMatchObject({ sourceId: added[0]!.id, actorId: user });
});

it('rolls the new source back if its addition activity cannot be saved', async () => {
  const { insertVaultSource } = await import('../../queries/insertVaultSource');
  await expect(insertVaultSource({ artistId: artist, url: 'https://example.test/rollback' }, undefined, {
    userId: '00000000-0000-4000-8000-000000000099', trigger: 'visitor_suggestion',
  })).rejects.toThrow();
  expect((await client.query("select id from artist_vault_sources where url = 'https://example.test/rollback'")).rows).toHaveLength(0);
});

it('preserves historical user origin when the account is deleted', async () => {
  await client.query('delete from users where id = $1', [user]);
  const result = await queue({ origin: 'research' });
  expect(result.items[0]).toMatchObject({ actorKind: 'user', actorId: null, origin: 'research' });
});

it.each(['pending', 'running'])('reports a %s source search for another claim as an enqueue failure', async status => {
  const { enqueueResearchJob, completeResearchJob } = await import('../../queries/researchJobQueries');
  const { withArtistOperation } = await import('../../artistOperationContext');
  const claimId = '00000000-0000-4000-8000-000000000004';
  const staleClaimId = '00000000-0000-4000-8000-000000000005';
  await client.query("delete from artist_research_jobs where kind = 'source_search'");
  const old = (await client.query<{ id: string }>("insert into artist_research_jobs (artist_id, kind, status, state) values ($1, 'source_search', $2, $3) returning id", [artist, status, JSON.stringify({ claimId: staleClaimId })])).rows[0]!;
  const enqueue = () => withArtistOperation(artist, { expectedClaimId: claimId, trigger: 'claim_approval' }, () => enqueueResearchJob(artist, 'source_search', { state: { claimId } }));
  expect(await enqueue()).toBe(false);
  const stillOld = (await client.query<{ id: string; state: { claimId: string } }>("select id, state from artist_research_jobs where kind = 'source_search'")).rows;
  expect(stillOld).toEqual([{ id: old.id, state: { claimId: staleClaimId } }]);
  await completeResearchJob(old.id);
  expect(await enqueue()).toBe(true);
  expect(await enqueue()).toBe(true); // Same claim reuses the live job.
  expect((await client.query("select id from artist_research_jobs where kind = 'source_search' and status = 'pending'")).rows).toHaveLength(1);
});

it('does not treat an unrecorded claim as a replacement claim search', async () => {
  const { enqueueResearchJob } = await import('../../queries/researchJobQueries');
  await client.query("delete from artist_research_jobs where kind = 'source_search'");
  expect(await enqueueResearchJob(artist, 'source_search')).toBe(true);
  expect(await enqueueResearchJob(artist, 'source_search', { state: { claimId: '00000000-0000-4000-8000-000000000004' } })).toBe(false);
});
