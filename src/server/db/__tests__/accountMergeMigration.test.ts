/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import * as schema from '@/server/db/schema';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, {schema});
const current = '00000000-0000-4000-8000-000000000001';
const legacy = '00000000-0000-4000-8000-000000000002';
const artist = '00000000-0000-4000-8000-000000000003';
beforeAll(async () => {
  await client.exec(`create table users (id uuid primary key, username text, email text, wallet text,
    privy_user_id text unique, legacy_id text, created_at timestamptz default now(), updated_at timestamptz default now(),
    is_admin boolean default false, is_white_listed boolean default false, is_super_admin boolean default false,
    is_hidden boolean default false, legacy_link_dismissed boolean default false, accepted_ugc_count bigint default 0);
    create table artists (id uuid primary key, name text, added_by uuid); create table ugcresearch (user_id uuid); create table artist_self_edits (user_id uuid);`);
  await client.exec(readFileSync('drizzle/0033_user_names.sql','utf8'));
  await client.exec(`create role mnweb; create role anon; create role authenticated;
    create function uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';
    create table artist_research_jobs (kind text);
    create table artist_vault_sources (id uuid primary key, artist_id uuid, created_at timestamptz default now());`);
  await client.exec(readFileSync('drizzle/0031_lore_attribution.sql','utf8'));
  // Simulate hosted default grants; the migration must explicitly revoke them.
  await client.exec('alter default privileges grant all on tables to anon, authenticated');
  await client.exec(readFileSync('drizzle/0035_account_merge_attribution.sql','utf8'));
  await client.exec(readFileSync('drizzle/0053_artist_bio_corrections.sql','utf8'));
  await client.exec(`grant select,insert,update,delete on users,artists,ugcresearch,artist_self_edits,artist_vault_sources to mnweb;
    alter table users enable row level security;
    create policy app_users on users to mnweb using (true) with check (true);`);
  await client.exec(`insert into artists(id,name) values ('${artist}','Fixture Artist')`);
});
beforeEach(async () => {
  await client.exec('reset role; delete from artist_bio_corrections; delete from account_merge_events');
  await driver.execute(sql`delete from artist_vault_sources`);
  await driver.execute(sql`delete from artist_activity_events`);
  await driver.execute(sql`delete from users`);
  await driver.execute(sql`insert into users (id,username,privy_user_id,username_needs_confirmation,username_prompted_at)
    values (${current},'Aux Bandit','test-privy',false,now()),(${legacy},'Original Listener',null,false,null)`);
  await client.exec('set role mnweb');
});
afterAll(async () => { await client.close(); });
it('keeps event and merge history immutable to app/browser roles', async () => {
  await expect(client.exec('update artist_activity_events set actor_user_id=null')).rejects.toThrow('permission denied');
  await expect(client.exec('delete from artist_activity_events')).rejects.toThrow('permission denied');
  for (const statement of [
    `insert into account_merge_events values ('${current}','${legacy}',0,now())`,
    'update account_merge_events set activity_count=0', 'delete from account_merge_events',
  ]) await expect(client.exec(statement)).rejects.toThrow('permission denied');
  for (const role of ['anon','authenticated']) {
    await client.exec(`reset role; set role ${role}`);
    await expect(client.exec('select * from account_merge_events')).rejects.toThrow('permission denied');
    await expect(client.exec(`select public.transfer_account_activity('${current}','${legacy}','test-privy')`))
      .rejects.toThrow('permission denied');
  }
});

it('rejects a direct transfer before identity moves, and mismatched or missing accounts afterward', async () => {
  await expect(client.exec(`select public.transfer_account_activity('${current}','${legacy}','test-privy')`))
    .rejects.toThrow('Source account identity has not been released');
  await driver.execute(sql`update users set privy_user_id=null where id=${current}`);
  await driver.execute(sql`update users set privy_user_id='test-privy' where id=${legacy}`);
  for (const [from,to,identity] of [
    [current,legacy,'wrong-owner'],[artist,legacy,'test-privy'],[current,artist,'test-privy'],
    [current,current,'test-privy'],[current,legacy,''],
  ]) await expect(client.exec(`select public.transfer_account_activity('${from}','${to}','${identity}')`)).rejects.toThrow();
  expect((await driver.execute(sql`select * from account_merge_events`)).rows).toHaveLength(0);
});
