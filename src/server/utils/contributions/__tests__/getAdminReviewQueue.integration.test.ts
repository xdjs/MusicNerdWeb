/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import type { SQL } from 'drizzle-orm';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: () => authorize() }));
const authorize = jest.fn();
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const execute = jest.fn(async (query: SQL) => (await driver.execute(query)).rows);
const database = { execute };
const user = '00000000-0000-4000-8000-000000000001';
const artist = '00000000-0000-4000-8000-000000000002';
const event = '00000000-0000-4000-8000-000000000003';
let read: typeof import('../getAdminReviewQueue').getAdminReviewQueue;
beforeAll(async () => {
  jest.resetModules();
  ({ getAdminReviewQueue: read } = await import('../getAdminReviewQueue'));
  await client.exec(`
    create table users (id uuid primary key, username text, email text);
    create table artists (id uuid primary key, name text);
    create table ugcresearch (id uuid primary key default gen_random_uuid(), artist_id uuid, user_id uuid, site_name text, ugc_url text, origin text default 'unknown', accepted boolean default false, date_processed timestamp, created_at timestamp default now());
    create table artist_activity_events (id uuid primary key, actor_user_id uuid, trigger text, actor_kind text);
    create table artist_vault_sources (id uuid primary key default gen_random_uuid(), artist_id uuid, activity_id uuid, title text, url text, origin text default 'unknown', status text default 'pending', created_at timestamptz default now(), extracted_text text);
    create table artist_bio_corrections (id uuid primary key default gen_random_uuid(), artist_id uuid, user_id uuid, reason text, details text, source_url text, bio_snapshot text, status text default 'pending', created_at timestamptz default now());
    insert into users values ('${user}', 'Contributor', 'private@example.test');
    insert into artists values ('${artist}', 'Example artist');
    insert into artist_activity_events values ('${event}', '${user}', 'editor_search', 'user');
  `);
}, 30000);
afterAll(async () => { await client.close(); });
beforeEach(async () => {
  authorize.mockResolvedValue({authenticated: true});
  execute.mockClear();
  await client.exec('truncate ugcresearch, artist_vault_sources, artist_bio_corrections');
});

it('rejects non-admin access before reading reports or counts', async () => {
  authorize.mockResolvedValue({authenticated: false});
  await expect(read()).rejects.toThrow('Administrator access required');
  expect(execute).not.toHaveBeenCalled();
});

async function seed() {
  await client.query(`insert into ugcresearch (artist_id,user_id,site_name,ugc_url,origin,created_at) select $1,$2,'Bandcamp','https://example.test/' || i,'submission','2026-10-01'::timestamp + i * interval '1 hour' from generate_series(1,26) i`, [artist,user]);
  await client.query(`insert into artist_vault_sources (artist_id,activity_id,title,url,origin,created_at,extracted_text) values ($1,$2,'Original source','https://source.test','research','2026-10-02 02:30Z','DO NOT RETURN private source text')`, [artist,event]);
  await client.query(`insert into artist_bio_corrections (artist_id,user_id,reason,details,source_url,bio_snapshot,created_at) values ($1,$2,'incorrect','Only 50% correct','https://correction.test','Reported public bio','2026-10-02 03:00Z')`,[artist,user]);
}

it('globally paginates all pending types newest first and counts independently of type', async () => {
  await seed();
  const first = await read();
  expect(first.total).toBe(28);
  expect(first.counts).toEqual({links:26,sources:1,corrections:1});
  expect(first.pendingCounts).toEqual(first.counts);
  expect(first.items).toHaveLength(25);
  expect(first.items.slice(0,3).map(item=>item.type)).toEqual(['corrections','sources','links']);
  expect(first.items[0]).toMatchObject({details:'Only 50% correct',bioSnapshot:'Reported public bio',actorName:'Contributor',actorId:user});
  expect(first.items[1]).toMatchObject({title:'Original source',url:'https://source.test',activityId:event,trigger:'editor_search',origin:'research'});
  const last = await read({page:999});
  expect(last.page).toBe(2);
  expect(last.items).toHaveLength(3);
  expect(new Set([...first.items,...last.items].map(item=>item.id)).size).toBe(28);
  const sources = await read({type:'sources'});
  expect(sources.total).toBe(1);
  expect(sources.counts).toEqual(first.counts);
  expect(sources.items[0].type).toBe('sources');
  expect(JSON.stringify(first.items)).not.toMatch(/private@example|DO NOT RETURN|extracted_text/);
});

it('searches contributor, artist, title, URL and literal details while preserving global pending counts', async () => {
  await seed();
  for (const query of ['contributor','private@example.test','Example artist']) expect((await read({query})).total).toBe(28);
  expect((await read({query:'Original source'})).counts).toEqual({links:0,sources:1,corrections:0});
  expect((await read({query:'https://correction.test'})).items[0].type).toBe('corrections');
  const literal = await read({query:' 50% ',type:'corrections'});
  expect(literal.query).toBe('50%');
  expect(literal.counts).toEqual({links:0,sources:0,corrections:1});
  expect(literal.pendingCounts).toEqual({links:26,sources:1,corrections:1});
  expect((await read({query:'_'})).total).toBe(0);
  expect((await read({query:"' OR true --"})).total).toBe(0);
  expect((await read({type:'invalid',page:-1})).type).toBe('all');
  expect((await read({type:'invalid',page:-1})).page).toBe(1);
});

it('excludes processed rows, Discord pings and missing artists, with stable tie ordering', async () => {
  await seed();
  await client.exec(`update ugcresearch set accepted=true where ugc_url='https://example.test/1';
    update ugcresearch set date_processed=now() where ugc_url='https://example.test/2';
    update ugcresearch set site_name='ugc_discord_ping' where ugc_url='https://example.test/3';
    update ugcresearch set artist_id=null where ugc_url='https://example.test/4';
    update artist_vault_sources set status='rejected';
    update artist_bio_corrections set status='resolved';
    update ugcresearch set created_at='2026-10-02';`);
  const result = await read();
  expect(result.counts).toEqual({links:22,sources:0,corrections:0});
  expect(result.items.map(item=>item.id)).toEqual(result.items.map(item=>item.id).sort().reverse());
  expect((await read()).items.map(item=>item.id)).toEqual(result.items.map(item=>item.id));
  await client.exec("update artist_vault_sources set status='pending',created_at='2026-10-02Z'; update artist_bio_corrections set status='pending',created_at='2026-10-02Z'");
  const tied = await read();
  expect(tied.items.map(item=>item.type)).toEqual(['corrections',...Array(22).fill('links'),'sources']);
});
