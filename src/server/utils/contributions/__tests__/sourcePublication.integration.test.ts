/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, { schema });
const database = {
  ...driver,
  transaction: (fn: (tx: unknown) => Promise<unknown>) => driver.transaction(tx => fn({
    ...tx, insert: tx.insert.bind(tx),
    execute: async (q: Parameters<typeof tx.execute>[0]) => (await tx.execute(q)).rows,
  })),
};
const artist = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const user = '00000000-0000-4000-8000-000000000003';
const source = '00000000-0000-4000-8000-000000000004';
const revision = '2026-01-01T00:00:00Z';
let decide: typeof import('../setSourcePublication').setSourcePublication;
beforeAll(async () => {
  jest.resetModules();
  ({ setSourcePublication: decide } = await import('../setSourcePublication'));
  await client.exec(`
    create table users(id uuid primary key,is_admin boolean);
    create table artists(id uuid primary key);
    create table artist_vault_sources(id uuid primary key,artist_id uuid,status text,updated_at timestamptz,extracted_text text);
    create table artist_claims(id uuid primary key,artist_id uuid,user_id uuid,status text);
    create table artist_onboarding_steps(artist_id uuid,step text,confirmed_at timestamptz);
    create table artist_research_jobs(id uuid);
    create table artist_activity_events(id uuid primary key default gen_random_uuid(),artist_id uuid,action text,actor_user_id uuid,actor_kind text,trigger text,source_id uuid,parent_activity_id uuid,created_at timestamptz default now());
  `);
  await client.exec(readFileSync('drizzle/0060_source_publication.sql','utf8').replaceAll('--> statement-breakpoint',''));
});
afterAll(() => client.close());
beforeEach(async () => {
  await client.exec(`truncate users,artists,artist_vault_sources,artist_claims,artist_onboarding_steps,artist_research_jobs,artist_activity_events;
    insert into users values('${admin}',true),('${user}',false);insert into artists values('${artist}');
    insert into artist_vault_sources(id,artist_id,status,updated_at,extracted_text) values('${source}','${artist}','approved','${revision}','original unchanged');`);
});
it('publishes one source with audit but no claim, onboarding, job or original rewrite; later claim still has no confirmation', async () => {
  await decide(admin,{sourceId:source,publication:'public',expectedUpdatedAt:revision});
  expect((await client.query('select publication,extracted_text from artist_vault_sources')).rows).toEqual([{publication:'public',extracted_text:'original unchanged'}]);
  expect((await client.query('select action,trigger,actor_user_id from artist_activity_events')).rows).toEqual([{action:'source_publication_public',trigger:'admin_publication:inherit->public',actor_user_id:admin}]);
  for (const table of ['artist_claims','artist_onboarding_steps','artist_research_jobs']) expect((await client.query(`select * from ${table}`)).rows).toEqual([]);
  await client.exec(`insert into artist_claims values(gen_random_uuid(),'${artist}','${user}','approved')`);
  expect((await client.query('select * from artist_onboarding_steps')).rows).toEqual([]);
});
it('rejects nonadmin, pending source and stale revision through actual SQL', async () => {
  await expect(decide(user,{sourceId:source,publication:'public',expectedUpdatedAt:revision})).rejects.toThrow('Admin access');
  await client.exec("update artist_vault_sources set status='pending'");
  await expect(decide(admin,{sourceId:source,publication:'public',expectedUpdatedAt:revision})).rejects.toThrow('Source changed');
  await client.exec("update artist_vault_sources set status='approved',updated_at='2026-01-02'");
  await expect(decide(admin,{sourceId:source,publication:'public',expectedUpdatedAt:revision})).rejects.toThrow('Source changed');
  expect((await client.query('select publication from artist_vault_sources')).rows).toEqual([{publication:'inherit'}]);
});
it('rolls publication back when audit insert fails', async () => {
  await client.exec("alter table artist_activity_events add constraint reject_audit check(action <> 'source_publication_public')");
  await expect(decide(admin,{sourceId:source,publication:'public',expectedUpdatedAt:revision})).rejects.toThrow();
  expect((await client.query('select publication from artist_vault_sources')).rows).toEqual([{publication:'inherit'}]);
  await client.exec('alter table artist_activity_events drop constraint reject_audit');
});
it('changes revision on privacy revocation and migration rejects unknown policy', async () => {
  await decide(admin,{sourceId:source,publication:'private',expectedUpdatedAt:revision});
  const [row] = (await client.query<{publication:string,changed:boolean}>(`select publication,updated_at <> '${revision}'::timestamptz as changed from artist_vault_sources`)).rows;
  expect(row).toEqual({publication:'private',changed:true});
  await expect(client.exec("update artist_vault_sources set publication='anything'")).rejects.toThrow();
});
