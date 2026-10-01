/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { sql, type SQL } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import * as schema from '@/server/db/schema';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/bookmarkQueries', () => ({ lockBookmarkUsers: jest.fn(), transferUserBookmarks: jest.fn() }));
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, {schema});
const database = { select: driver.select.bind(driver), execute: async (q: SQL) => (await driver.execute(q)).rows, transaction: (fn: any) => driver.transaction(tx => fn({
  query: tx.query, update: tx.update.bind(tx), delete: tx.delete.bind(tx),
  execute: async (q: SQL) => (await tx.execute(q)).rows,
})) };
const current = '00000000-0000-4000-8000-000000000001';
const legacy = '00000000-0000-4000-8000-000000000002';
const artist = '00000000-0000-4000-8000-000000000003';
const event = '00000000-0000-4000-8000-000000000004';
const source = '00000000-0000-4000-8000-000000000005';
let addSourceContributors: typeof import('../../source/addSourceContributors').addSourceContributors;
let getArtistActivity: typeof import('../../activity/getArtistActivity').getArtistActivity;
let mergeAccounts: typeof import('../../queries/userQueries').mergeAccounts;
beforeAll(async () => {
  jest.resetModules(); ({mergeAccounts}=await import('../../queries/userQueries'));
  ({addSourceContributors}=await import('../../source/addSourceContributors'));
  ({getArtistActivity}=await import('../../activity/getArtistActivity'));
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
  await client.exec(`grant select,insert,update,delete on users,artists,ugcresearch,artist_self_edits,artist_vault_sources to mnweb;
    alter table users enable row level security;
    create policy app_users on users to mnweb using (true) with check (true);`);
  await client.exec(`insert into artists(id,name) values ('${artist}','Fixture Artist')`);
});
beforeEach(async () => {
  await client.exec('reset role; delete from account_merge_events');
  await driver.execute(sql`delete from artist_vault_sources`);
  await driver.execute(sql`delete from artist_activity_events`);
  await driver.execute(sql`delete from users`);
  await driver.execute(sql`insert into users (id,username,privy_user_id,username_needs_confirmation,username_prompted_at)
    values (${current},'Aux Bandit','test-privy',false,now()),(${legacy},'Original Listener',null,false,null)`);
  await client.exec('set role mnweb');
});
afterAll(async () => { await client.close(); });
it('moves the confirmed current name without violating the unique index or prompting again', async () => {
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  const rows=await driver.query.users.findMany();
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({id:legacy,username:'Aux Bandit',usernameNeedsConfirmation:false,privyUserId:'test-privy'});
});
it('preserves a legacy chosen name when the current generated name was not confirmed', async () => {
  await driver.execute(sql`update users set username_needs_confirmation=true where id=${current}`);
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  expect((await driver.query.users.findMany())[0]).toMatchObject({id:legacy,username:'Original Listener',usernameNeedsConfirmation:false});
});
it('retains dismissal when both accounts still have generated names', async () => {
  await driver.execute(sql`update users set username_needs_confirmation=true`);
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  const user=(await driver.query.users.findMany())[0];
  expect(user.username).toBe('Original Listener');
  expect(user.usernameNeedsConfirmation).toBe(true);
  expect(user.usernamePromptedAt).not.toBeNull();
});

it('rolls back the name transfer if the later merge work fails', async () => {
  const {transferUserBookmarks}=await import('@/server/utils/queries/bookmarkQueries');
  (transferUserBookmarks as jest.Mock).mockRejectedValueOnce(new Error('Transfer failed'));
  expect(await mergeAccounts(current,legacy)).toEqual({success:false,error:'Merge failed'});
  const rows=await driver.query.users.findMany();
  expect(rows).toEqual(expect.arrayContaining([
    expect.objectContaining({id:current,username:'Aux Bandit',privyUserId:'test-privy'}),
    expect.objectContaining({id:legacy,username:'Original Listener',privyUserId:null}),
  ]));
});


it('preserves real Lore credits and Admin activity after merging the contributor', async () => {
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger,source_id)
    values (${event},${artist},${current},'user','source_added','editor',${source})`);
  await driver.execute(sql`insert into artist_vault_sources(id,artist_id,activity_id,origin)
    values (${source},${artist},${event},'submission')`);
  const before = (await driver.execute(sql`select * from artist_activity_events where id=${event}`)).rows[0];
  const sourceBefore = (await driver.execute(sql`select * from artist_vault_sources where id=${source}`)).rows[0];
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  const [saved] = (await driver.execute(sql`select id,artist_id as "artistId",activity_id as "activityId",origin from artist_vault_sources where id=${source}`)).rows;
  expect((await addSourceContributors(artist,[saved as ArtistVaultSource]))[0].contributorName).toBe('Aux Bandit');
  expect((await getArtistActivity({eventId:event})).items[0]).toMatchObject({actorId:legacy,actorName:'Aux Bandit'});
  expect((await driver.execute(sql`select * from artist_activity_events where id=${event}`)).rows[0]).toEqual({...before,actor_user_id:legacy});
  expect((await driver.execute(sql`select * from artist_vault_sources where id=${source}`)).rows[0]).toEqual(sourceBefore);
});


it('transfers every originating event but preserves unknown actors and the survivor’s own history', async () => {
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger,parent_activity_id)
    values (${event},${artist},${current},'user','research_requested','editor',null),
    (gen_random_uuid(),${artist},${current},'system','source_added','source_search',${event}),
    (gen_random_uuid(),${artist},${legacy},'user','source_added','editor',null),
    (gen_random_uuid(),${artist},null,'unknown','source_added','legacy',null)`);
  const before = (await driver.execute(sql`select * from artist_activity_events order by id`)).rows;
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  expect((await driver.execute(sql`select * from artist_activity_events order by id`)).rows).toEqual(
    before.map(row => ({...row,actor_user_id:row.actor_user_id === current ? legacy : row.actor_user_id})));
  expect((await driver.execute(sql`select source_user_id,target_user_id,activity_count from account_merge_events`)).rows)
    .toEqual([{source_user_id:current,target_user_id:legacy,activity_count:2}]);
});

it('rolls back attribution and its audit entry when later merge work fails', async () => {
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger)
    values (${event},${artist},${current},'user','source_added','editor')`);
  const {transferUserBookmarks}=await import('@/server/utils/queries/bookmarkQueries');
  (transferUserBookmarks as jest.Mock).mockRejectedValueOnce(new Error('Transfer failed'));
  expect(await mergeAccounts(current,legacy)).toEqual({success:false,error:'Merge failed'});
  expect((await getArtistActivity({eventId:event})).items[0]).toMatchObject({actorId:current,actorName:'Aux Bandit'});
  expect((await driver.execute(sql`select * from account_merge_events`)).rows).toHaveLength(0);
  expect((await driver.query.users.findMany()).map(user => user.id)).toEqual(expect.arrayContaining([current,legacy]));
});

it('rejects a different linked owner without changing attribution', async () => {
  await driver.execute(sql`update users set privy_user_id='another-owner' where id=${legacy}`);
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger)
    values (${event},${artist},${current},'user','source_added','editor')`);
  expect(await mergeAccounts(current,legacy)).toMatchObject({success:false});
  expect((await getArtistActivity({eventId:event})).items[0].actorId).toBe(current);
  expect((await driver.execute(sql`select * from account_merge_events`)).rows).toHaveLength(0);
});

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

it('retains an audit chain through a second account merge', async () => {
  const next = '00000000-0000-4000-8000-000000000006';
  await driver.execute(sql`insert into users(id,username) values(${next},'Older account')`);
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger)
    values (${event},${artist},${current},'user','source_added','editor')`);
  expect(await mergeAccounts(current,legacy)).toEqual({success:true});
  expect(await mergeAccounts(legacy,next)).toEqual({success:true});
  expect((await getArtistActivity({eventId:event})).items[0]).toMatchObject({actorId:next,actorName:'Aux Bandit'});
  expect((await driver.execute(sql`select source_user_id,target_user_id,activity_count from account_merge_events order by source_user_id`)).rows)
    .toEqual([{source_user_id:current,target_user_id:legacy,activity_count:1}, {source_user_id:legacy,target_user_id:next,activity_count:1}]);
});


it('fails closed if the transfer migration is missing', async () => {
  await client.exec('reset role; alter function public.transfer_account_activity(uuid,uuid,text) rename to unavailable_transfer; set role mnweb');
  try {
    expect(await mergeAccounts(current,legacy)).toEqual({success:false,error:'Merge failed'});
    expect((await driver.query.users.findMany()).find(user => user.id === current)?.privyUserId).toBe('test-privy');
    expect((await driver.query.users.findMany()).find(user => user.id === legacy)?.privyUserId).toBeNull();
  } finally {
    await client.exec('reset role; alter function public.unavailable_transfer(uuid,uuid,text) rename to transfer_account_activity; set role mnweb');
  }
});

it('rolls back the actor transfer if recording its audit entry fails', async () => {
  await client.exec(`reset role; insert into account_merge_events(source_user_id,target_user_id,activity_count)
    values ('${current}','${legacy}',0); set role mnweb`);
  await driver.execute(sql`insert into artist_activity_events(id,artist_id,actor_user_id,actor_kind,action,trigger)
    values (${event},${artist},${current},'user','source_added','editor')`);
  expect(await mergeAccounts(current,legacy)).toEqual({success:false,error:'Merge failed'});
  expect((await getArtistActivity({eventId:event})).items[0].actorId).toBe(current);
  expect((await driver.execute(sql`select activity_count from account_merge_events`)).rows).toEqual([{activity_count:0}]);
});
