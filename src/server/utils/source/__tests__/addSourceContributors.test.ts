/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { sql, type SQL } from 'drizzle-orm';
import type { ArtistVaultSource } from '@/server/db/DbTypes';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
let pg: any;
let driver: ReturnType<typeof drizzle>;
const database = { execute: async (query: SQL) => (await driver.execute(query)).rows };
const artist = '00000000-0000-4000-8000-000000000001';
const event = '00000000-0000-4000-8000-000000000002';
const user = '00000000-0000-4000-8000-000000000003';
const source = { id: 'source', artistId: artist, activityId: event, origin: 'submission' } as ArtistVaultSource;
beforeAll(async () => {
  jest.resetModules();
  pg = new PGlite(); driver = drizzle(pg);
  await pg.exec(`create table users (id uuid primary key, username text, is_hidden boolean);
    create table artist_activity_events (id uuid primary key, artist_id uuid, actor_user_id uuid, actor_kind text);
    insert into users values ('${user}', 'Listener', false);
    insert into artist_activity_events values ('${event}', '${artist}', '${user}', 'user');`);
});
afterAll(async () => { await pg.close(); });
it('resolves only safe display names from the original same-artist activity', async () => {
  const { addSourceContributors } = await import('../addSourceContributors');
  expect(await addSourceContributors(artist, [source])).toEqual([{ ...source, contributorName: 'Listener' }]);
  expect(await addSourceContributors('00000000-0000-4000-8000-000000000099', [source])).toEqual([{ ...source, contributorName: null }]);
  expect(await addSourceContributors(artist, [{ ...source, origin: 'research' }])).toEqual([{ ...source, origin: 'research', contributorName: null }]);
  await database.execute(sql`update users set is_hidden = true`);
  expect((await addSourceContributors(artist, [source]))[0].contributorName).toBeNull();
  await database.execute(sql`delete from users`);
  expect((await addSourceContributors(artist, [source]))[0].contributorName).toBeNull();
  expect(await addSourceContributors(artist, [])).toEqual([]);
});
