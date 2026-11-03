/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
import { saveBioHistory } from '../saveBioHistory';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
it('adds nullable lineage without changing legacy data and preserves distinct identical-text evidence', async () => {
    const pg = new PGlite();
    try {
        await pg.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key,bio text);
            create table artist_bio_versions(id uuid primary key default gen_random_uuid(),artist_id uuid,bio_text text,is_pinned boolean default false,created_at timestamptz default now());
            insert into artists values('00000000-0000-4000-8000-000000000001','Legacy');
            insert into artist_bio_versions(artist_id,bio_text,is_pinned) values('00000000-0000-4000-8000-000000000001','Legacy',true);`);
        await pg.exec(readFileSync(resolve(process.cwd(), 'drizzle/0061_about_evidence_provenance.sql'), 'utf8'));
        expect((await pg.query('select bio from artists')).rows).toEqual([{bio:'Legacy'}]);
        expect((await pg.query('select bio_text,is_pinned from artist_bio_versions')).rows).toEqual([{bio_text:'Legacy',is_pinned:true}]);
        const db=drizzle(pg,{schema}), artist='00000000-0000-4000-8000-000000000001';
        const first={version:1,kind:'unknown',bioHash:'hash'}, second={...first,bioHash:'different'};
        const save=async(provenance:unknown)=>db.transaction(tx=>saveBioHistory(tx as never,artist,[{text:'Legacy',provenance}]));
        await save(null); await save(first); await save(first); await save(second);
        expect((await pg.query('select p.provenance from artist_bio_versions v left join mn_private.artist_bio_version_provenance p on p.version_id=v.id order by v.created_at,v.id')).rows).toEqual([{provenance:null},{provenance:first},{provenance:second}]);
    } finally {await pg.close();}
},30000);
it('revocation copies current provenance once and preserves unknown legacy history separately',async()=>{
 const pg=new PGlite(); const artist='00000000-0000-4000-8000-000000000001';
 try{
  await pg.exec(`create role mnweb;create role anon;create role authenticated;create table artists(id uuid primary key,bio text);create table artist_bio_versions(id uuid primary key default gen_random_uuid(),artist_id uuid,bio_text text,is_pinned boolean default false,created_at timestamptz default now());insert into artists values('${artist}','Saved About');insert into artist_bio_versions(artist_id,bio_text) values('${artist}','Saved About');`);
  await pg.exec(readFileSync('drizzle/0061_about_evidence_provenance.sql','utf8'));
  const provenance={version:1,kind:'unknown',bioHash:'hash'};
  await pg.query('insert into mn_private.artist_bio_provenance values($1,$2)',[artist,provenance]);
  const db=drizzle(pg);const {preserveRevokedBio}=await import('../preserveRevokedBio');
  await db.transaction(tx=>preserveRevokedBio(tx as never,artist));await db.transaction(tx=>preserveRevokedBio(tx as never,artist));
  const rows=(await pg.query('select v.bio_text,p.provenance from artist_bio_versions v left join mn_private.artist_bio_version_provenance p on p.version_id=v.id')).rows;
  expect(rows).toHaveLength(2);expect(rows).toEqual(expect.arrayContaining([{bio_text:'Saved About',provenance:null},{bio_text:'Saved About',provenance}]));
 }finally{await pg.close();}
},30000);
