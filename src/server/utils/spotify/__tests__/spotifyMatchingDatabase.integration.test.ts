/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { cancelSpotifyMatchForIdentityEdit } from '../cancelSpotifyMatchForIdentityEdit';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client);
const artist = '00000000-0000-4000-8000-000000000001';
beforeAll(async () => {
 await client.exec(`create role mnweb; create role anon; create role authenticated;
 create table artist_research_jobs(artist_id uuid,kind text constraint artist_research_jobs_kind_check check(kind='source_search'),status text,claimed_at timestamptz,last_error text,updated_at timestamptz,state jsonb);
 grant select,insert,update on artist_research_jobs to mnweb;`);
 await client.exec(readFileSync('drizzle/0049_deferred_spotify_matching.sql','utf8'));
});
afterAll(() => client.close());
it('gives only the server role access and keeps the later shared provider deadline', async () => {
 await client.exec('set role mnweb');
 await client.exec(`insert into provider_request_cooldowns values('spotify:fixture','2026-10-16T10:00:00Z',now());
 insert into provider_request_cooldowns values('spotify:fixture','2026-10-15T10:00:00Z',now())
 on conflict(provider_key) do update set blocked_until=greatest(provider_request_cooldowns.blocked_until,excluded.blocked_until);`);
 const rows = await client.query<{ blocked_until: Date }>('select blocked_until from provider_request_cooldowns');
 expect(new Date(rows.rows[0].blocked_until).toISOString()).toBe('2026-10-16T10:00:00.000Z');
 await client.exec('reset role; set role anon');
 await expect(client.query('select * from provider_request_cooldowns')).rejects.toThrow('permission denied');
 await client.exec('reset role; set role authenticated');
 await expect(client.query('select * from provider_request_cooldowns')).rejects.toThrow('permission denied');
 await client.exec('reset role');
});
it('cancels only live matching work when an identity changes and rolls back atomically with the edit', async () => {
 await client.exec(`insert into artist_research_jobs values('${artist}','spotify_match','running',now(),null,now(),'{}'),('${artist}','source_search','pending',null,null,now(),'{}');`);
 await expect(database.transaction(async tx => { await cancelSpotifyMatchForIdentityEdit(tx as never, artist); throw new Error('edit failed'); })).rejects.toThrow('edit failed');
 expect((await client.query("select status from artist_research_jobs where kind='spotify_match'")).rows).toEqual([{ status: 'running' }]);
 await database.transaction(tx => cancelSpotifyMatchForIdentityEdit(tx as never, artist));
 expect((await client.query("select kind,status,state from artist_research_jobs order by kind")).rows).toEqual([
 {kind:'source_search',status:'pending',state:{}},
 {kind:'spotify_match',status:'done',state:{identityChanged:true,outcome:'identity_changed'}},
 ]);
});
