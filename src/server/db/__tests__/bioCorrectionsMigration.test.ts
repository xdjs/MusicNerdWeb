/** @jest-environment node */
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
import { readFileSync } from 'node:fs';
const id = '11111111-1111-4111-8111-111111111111';
let client: InstanceType<typeof PGlite>;
beforeAll(async () => {
 client = new PGlite();
 await client.exec(`create role mnweb; create role anon; create role authenticated; create table artists(id uuid primary key); create table users(id uuid primary key); insert into artists values('${id}'); insert into users values('${id}'); alter default privileges in schema public grant all on tables to anon, authenticated;`);
 await client.exec(readFileSync('drizzle/0053_artist_bio_corrections.sql', 'utf8'));
});
afterAll(async () => { await client.close(); });
afterEach(async () => { await client.exec('reset role'); });
it.each(['anon', 'authenticated'])('denies public role %s even with inherited grants', async role => {
 await client.exec(`set role ${role}`);
 await expect(client.query('select * from artist_bio_corrections')).rejects.toThrow(/permission denied/);
});
it('supports app-role reports and attributed review without delete access', async () => {
 await client.exec('set role mnweb');
 await client.exec(`insert into artist_bio_corrections(artist_id,user_id,reason,details,bio_snapshot) values('${id}','${id}','wrong_artist','A namesake','Original bio')`);
 expect((await client.query('select status, bio_snapshot from artist_bio_corrections')).rows).toEqual([{ status: 'pending', bio_snapshot: 'Original bio' }]);
 await expect(client.exec("update artist_bio_corrections set status='resolved'")).rejects.toThrow(/check constraint/);
 await client.exec(`update artist_bio_corrections set status='resolved',reviewed_by='${id}',reviewed_at=now()`);
 expect((await client.query('select bio_snapshot from artist_bio_corrections')).rows).toEqual([{ bio_snapshot: 'Original bio' }]);
 await expect(client.exec('delete from artist_bio_corrections')).rejects.toThrow(/permission denied/);
});
it('enables RLS and bounds stored reports', async () => {
 expect((await client.query("select relrowsecurity from pg_class where relname='artist_bio_corrections'")).rows).toEqual([{ relrowsecurity: true }]);
 await client.exec('set role mnweb');
 await expect(client.exec(`insert into artist_bio_corrections(artist_id,user_id,reason,details,bio_snapshot) values('${id}','${id}','other',repeat('x',2001),'bio')`)).rejects.toThrow(/check constraint/);
});
