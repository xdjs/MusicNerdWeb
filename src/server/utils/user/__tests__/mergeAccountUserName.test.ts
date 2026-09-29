/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { sql, type SQL } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import * as schema from '@/server/db/schema';
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/queries/bookmarkQueries', () => ({ lockBookmarkUsers: jest.fn(), transferUserBookmarks: jest.fn() }));
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client, {schema});
const database = { transaction: (fn: any) => driver.transaction(tx => fn({
  query: tx.query, update: tx.update.bind(tx), delete: tx.delete.bind(tx),
  execute: async (q: SQL) => (await tx.execute(q)).rows,
})) };
const current = '00000000-0000-4000-8000-000000000001';
const legacy = '00000000-0000-4000-8000-000000000002';
let mergeAccounts: typeof import('../../queries/userQueries').mergeAccounts;
beforeAll(async () => {
  jest.resetModules(); ({mergeAccounts}=await import('../../queries/userQueries'));
  await client.exec(`create table users (id uuid primary key, username text, email text, wallet text,
    privy_user_id text unique, legacy_id text, created_at timestamptz default now(), updated_at timestamptz default now(),
    is_admin boolean default false, is_white_listed boolean default false, is_super_admin boolean default false,
    is_hidden boolean default false, legacy_link_dismissed boolean default false, accepted_ugc_count bigint default 0);
    create table artists (added_by uuid); create table ugcresearch (user_id uuid); create table artist_self_edits (user_id uuid);`);
  await client.exec(readFileSync('drizzle/0033_user_names.sql','utf8'));
});
beforeEach(async () => {
  await driver.execute(sql`delete from users`);
  await driver.execute(sql`insert into users (id,username,privy_user_id,username_needs_confirmation,username_prompted_at)
    values (${current},'Aux Bandit','test-privy',false,now()),(${legacy},'Original Listener',null,false,null)`);
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
