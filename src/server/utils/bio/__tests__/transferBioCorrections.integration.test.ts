/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import { transferBioCorrections } from '../transferBioCorrections';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const db = drizzle(client);
const current='00000000-0000-4000-8000-000000000001';
const survivor='00000000-0000-4000-8000-000000000002';
const artist='00000000-0000-4000-8000-000000000003';
beforeAll(async()=>{
 await client.exec('create role mnweb; create role anon; create role authenticated; create table users(id uuid primary key); create table artists(id uuid primary key); grant select,delete on users to mnweb');
 await client.exec(readFileSync('drizzle/0053_artist_bio_corrections.sql','utf8'));
});
beforeEach(async()=>{
 await client.exec(`truncate artist_bio_corrections,users,artists; insert into users values('${current}'),('${survivor}'); insert into artists values('${artist}');
 insert into artist_bio_corrections(artist_id,user_id,reason,details,bio_snapshot) values('${artist}','${current}','other','Submitted','Original');
 insert into artist_bio_corrections(artist_id,user_id,reason,details,bio_snapshot,status,reviewed_by,reviewed_at) values('${artist}','${survivor}','other','Reviewed','Original','resolved','${current}',now());`);
});
afterAll(()=>client.close());
it('preserves authors and reviewers under mnweb before deleting the placeholder',async()=>{
 await db.transaction(async tx=>{
  await tx.execute(sql`set local role mnweb`);
  await transferBioCorrections(tx as never,current,survivor);
  await tx.execute(sql`delete from users where id=${current}::uuid`);
 });
 expect((await client.query('select user_id,reviewed_by,status,details from artist_bio_corrections order by details')).rows).toEqual([
  {user_id:survivor,reviewed_by:survivor,status:'resolved',details:'Reviewed'},
  {user_id:survivor,reviewed_by:null,status:'pending',details:'Submitted'},
 ]);
});
it('rolls back attribution and deletion if the enclosing merge fails',async()=>{
 await expect(db.transaction(async tx=>{
  await transferBioCorrections(tx as never,current,survivor);
  await tx.execute(sql`delete from users where id=${current}::uuid`);
  throw new Error('later merge failure');
 })).rejects.toThrow('later merge failure');
 expect((await client.query('select id from users where id=$1',[current])).rows).toHaveLength(1);
 expect((await client.query("select user_id from artist_bio_corrections where details='Submitted'")).rows).toEqual([{user_id:current}]);
 expect((await client.query("select reviewed_by from artist_bio_corrections where details='Reviewed'")).rows).toEqual([{reviewed_by:current}]);
});
