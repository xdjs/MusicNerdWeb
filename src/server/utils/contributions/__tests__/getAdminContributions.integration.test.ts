/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import type { SQL } from 'drizzle-orm';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const database = { execute: async (query: SQL) => (await driver.execute(query)).rows };
const user = '00000000-0000-4000-8000-000000000001';
const artist = '00000000-0000-4000-8000-000000000002';
let read: typeof import('../getAdminContributions').getAdminContributions;
beforeAll(async () => {
  jest.resetModules();
  ({ getAdminContributions: read } = await import('../getAdminContributions'));
  await client.exec(`
    create table users (id uuid primary key, username text, email text);
    create table artists (id uuid primary key, name text);
    create table ugcresearch (id uuid primary key default gen_random_uuid(), artist_id uuid, user_id uuid, name text, site_name text, ugc_url text, accepted boolean default false, date_processed timestamp, created_at timestamp default now());
    create table artist_activity_events (id uuid primary key default gen_random_uuid(), actor_user_id uuid, actor_kind text, trigger text);
    create type source_status as enum ('pending', 'approved', 'rejected');
    create table artist_vault_sources (id uuid primary key default gen_random_uuid(), artist_id uuid, activity_id uuid, title text, url text, origin text default 'unknown', file_path text, status source_status default 'pending', created_at timestamptz default now());
    insert into users values ('${user}', 'Example contributor', 'contributor@example.test');
    insert into artists values ('${artist}', 'Example artist');
  `);
  await client.exec(readFileSync('drizzle/0032_ugc_submission_origin.sql', 'utf8'));
}, 30000);
afterAll(async () => { await client.close(); });
beforeEach(async () => {
  await client.exec('truncate ugcresearch, artist_activity_events, artist_vault_sources');
});
it('counts all matching items, groups uploads with user submissions and keeps user-triggered research automated', async () => {
  await client.query(`insert into ugcresearch (artist_id, user_id, ugc_url, origin) select $1, $2, 'https://example.test/' || i, 'submission' from generate_series(1, 26) i`, [artist, user]);
  await client.query(`insert into ugcresearch (artist_id, user_id, ugc_url) values ($1, $2, 'https://example.test/legacy')`, [artist, user]);
  await client.exec("insert into ugcresearch (site_name, accepted) values ('ugc_discord_ping', true)");
  const event = await client.query<{id:string}>("insert into artist_activity_events (actor_user_id, actor_kind, trigger) values ($1, 'user', 'editor_search') returning id", [user]);
  await client.query(`insert into artist_vault_sources (artist_id, activity_id, origin, file_path, status) values ($1, $2, 'research', null, 'pending'), ($1, $2, 'upload', 'file.pdf', 'approved')`, [artist, event.rows[0].id]);
  const all = await read({ userId: user, status: 'all' });
  expect(all.total).toBe(29);
  expect(all.items).toHaveLength(25);
  expect(all.counts).toEqual({ user: { total: 27, pending: 26 }, research: { total: 1, pending: 1 }, unknown: { total: 1, pending: 1 } });
  const pending = await read({ userId: user, origin: 'user', page: 999 });
  expect(pending.total).toBe(26);
  expect(pending.page).toBe(2);
  expect(pending.items).toHaveLength(1);
  expect(pending.items[0].origin).toBe('user');
  const research = await read({ userId: user, origin: 'research' });
  expect(research.items[0]).toMatchObject({ userId: user, origin: 'research', trigger: 'editor_search' });
});
it('filters exact user, type, escaped query and review status; counts reconcile after moderation', async () => {
  await client.query(`insert into ugcresearch (artist_id, user_id, ugc_url, origin) values ($1, $2, 'https://example.test/user', 'submission'), ($1, null, 'https://example.test/no-user', 'unknown')`, [artist, user]);
  expect((await read({ userId: user, type: 'link' })).total).toBe(1);
  expect((await read({ query: '%' })).total).toBe(0);
  expect((await read({ query: 'example contributor' })).total).toBe(1);
  await client.exec("update ugcresearch set accepted = true, date_processed = now() where origin = 'submission'");
  expect((await read({ userId: user })).counts.user).toEqual({ total: 1, pending: 0 });
  expect((await read({ userId: user, status: 'approved' })).total).toBe(1);
  expect((await read({ userId: user })).total).toBe(0);
  await client.exec("update ugcresearch set accepted = false where origin = 'submission'");
  expect((await read({ userId: user, status: 'rejected' })).total).toBe(1);
  expect((await read({ userId: user })).total).toBe(0);
  expect((await read({ userId: 'not-a-uuid', status: 'all' })).total).toBe(0);
});
