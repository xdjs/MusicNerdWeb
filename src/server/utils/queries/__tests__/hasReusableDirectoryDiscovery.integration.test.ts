/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { hasReusableDirectoryDiscovery } from '../hasReusableDirectoryDiscovery';
jest.mock('@/server/db/drizzle', () => ({ db: {} }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const reader = drizzle(client) as never;
const artist = '00000000-0000-4000-8000-000000000001';
const claim = '00000000-0000-4000-8000-000000000002';
const event = '00000000-0000-4000-8000-000000000003';
const user = '00000000-0000-4000-8000-000000000004';
const check = () => hasReusableDirectoryDiscovery(artist, claim, reader);
const checkpoint = () => client.exec(`
  update artist_research_jobs set state = jsonb_build_object(
    'claimId', null,
    'purpose', 'directory_preparation',
    'creationActivityId', '${event}',
    'directoryDiscovery', jsonb_build_object(
      'version', 1,
      'identity', jsonb_build_object('name', 'Fixture', 'spotify', null, 'deezer', '123'),
      'sourcesRevision', (
        select md5(coalesce(jsonb_agg(
          public.knowledge_vault_source_snapshot(v) - 'status' - 'updatedAt' order by v.id
        ), '[]'::jsonb)::text)
        from artist_vault_sources v
        where artist_id = '${artist}' and activity_id = '${event}' and origin = 'research'
      )
    )
  )
`);

beforeAll(async () => {
  await client.exec(`
    create table artists(id uuid,added_by uuid,name text,spotify text,deezer text);
    create table artist_claims(id uuid,artist_id uuid,status text);
    create table artist_activity_events(id uuid,artist_id uuid,actor_user_id uuid,actor_kind text,action text,trigger text);
    create table artist_research_jobs(id uuid,artist_id uuid,activity_id uuid,kind text,status text,state jsonb,updated_at timestamptz);
    create table artist_vault_sources(id uuid,artist_id uuid,activity_id uuid,status text,origin text,type text,file_path text,url text,title text,snippet text,extracted_text text,published_at timestamptz,created_at timestamptz,updated_at timestamptz);
  `);
  const migration = readFileSync('drizzle/0039_source_versions.sql', 'utf8');
  await client.exec(migration.slice(migration.indexOf('CREATE FUNCTION public.knowledge_vault_source_snapshot'), migration.indexOf('CREATE FUNCTION public.knowledge_social_post_snapshot')));
}, 30000);
afterAll(() => client.close());
beforeEach(async () => {
  await client.exec(`truncate artists,artist_claims,artist_activity_events,artist_research_jobs,artist_vault_sources;
    insert into artists values('${artist}','${user}','Fixture',null,'123');
    insert into artist_claims values('${claim}','${artist}','approved');
    insert into artist_activity_events values('${event}','${artist}','${user}','user','directory_add','directory_add');
    insert into artist_research_jobs values('${event}','${artist}','${event}','source_search','done','{}',now()-interval '1 hour');
    insert into artist_vault_sources(id,artist_id,activity_id,status,origin,title,extracted_text,created_at,updated_at) values('${event}','${artist}','${event}','pending','research','Source','Readable material',now(),now());`);
  await checkpoint();
});
it('reuses unchanged completed discovery after explicit approval or rejection', async () => {
  expect(await check()).toBe(true);
  for (const status of ['approved','rejected']) {
    await client.query('update artist_vault_sources set status=$1,updated_at=now()', [status]);
    expect(await check()).toBe(true);
  }
});
it('accepts a completed empty discovery, not an absent checkpoint', async () => {
  await client.exec('delete from artist_vault_sources');
  await checkpoint();
  expect(await check()).toBe(true);
  await client.exec("update artist_research_jobs set state=state-'directoryDiscovery'");
  expect(await check()).toBe(false);
});
it.each([
  "update artist_research_jobs set status='running'",
  "update artist_research_jobs set status='error'",
  "update artist_research_jobs set updated_at=now()-interval '25 hours'",
  "update artist_research_jobs set updated_at=now()+interval '1 hour'",
  "update artist_research_jobs set state=jsonb_set(state,'{directoryDiscovery,version}','2')",
  "update artist_research_jobs set state=jsonb_set(state,'{claimId}','\"different\"')",
  "update artist_research_jobs set state=jsonb_set(state,'{purpose}','\"claim\"')",
  "update artist_research_jobs set state=jsonb_set(state,'{creationActivityId}','\"different\"')",
  "update artists set name='Namesake'",
  "update artists set spotify='new-provider'",
  "update artists set added_by=null",
  "update artist_activity_events set actor_kind='system'",
  "update artist_activity_events set action='other'",
  "update artist_activity_events set trigger='claim_approval'",
  "update artist_claims set status='pending'",
  "delete from artist_claims",
  "update artist_vault_sources set extracted_text='Changed evidence'",
  "delete from artist_vault_sources",
])('falls back when checkpoint scope or evidence changes: %s', async mutation => {
  await client.exec(mutation);
  expect(await check()).toBe(false);
});
it('binds the exact artist and approved claim', async () => {
  expect(await hasReusableDirectoryDiscovery(event, claim, reader)).toBe(false);
  expect(await hasReusableDirectoryDiscovery(artist, event, reader)).toBe(false);
});
it('ignores unrelated sources, but detects new original-event research', async () => {
  await client.exec(`insert into artist_vault_sources(id,artist_id,activity_id,origin) values('${user}','${artist}','${event}','user')`);
  expect(await check()).toBe(true);
  await client.exec("update artist_vault_sources set origin='research' where origin='user'");
  expect(await check()).toBe(false);
});
