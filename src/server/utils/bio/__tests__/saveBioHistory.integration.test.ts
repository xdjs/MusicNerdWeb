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
        await pg.exec(`create table artists(id uuid primary key,bio text);
            create table artist_bio_versions(id uuid primary key default gen_random_uuid(),artist_id uuid,bio_text text,is_pinned boolean default false,created_at timestamptz default now());
            insert into artists values('00000000-0000-4000-8000-000000000001','Legacy');
            insert into artist_bio_versions(artist_id,bio_text,is_pinned) values('00000000-0000-4000-8000-000000000001','Legacy',true);`);
        await pg.exec(readFileSync(resolve(process.cwd(), 'drizzle/0061_about_evidence_provenance.sql'), 'utf8'));
        expect((await pg.query('select bio,bio_provenance from artists')).rows).toEqual([{bio:'Legacy',bio_provenance:null}]);
        expect((await pg.query('select bio_text,bio_provenance,is_pinned from artist_bio_versions')).rows).toEqual([{bio_text:'Legacy',bio_provenance:null,is_pinned:true}]);
        const db=drizzle(pg,{schema}), artist='00000000-0000-4000-8000-000000000001';
        const first={version:1,kind:'unknown',bioHash:'hash'}, second={...first,bioHash:'different'};
        const save=async(provenance:unknown)=>db.transaction(tx=>saveBioHistory(tx as never,artist,[{text:'Legacy',provenance}]));
        await save(null); await save(first); await save(first); await save(second);
        expect((await pg.query('select bio_provenance from artist_bio_versions')).rows).toEqual([{bio_provenance:null},{bio_provenance:first},{bio_provenance:second}]);
    } finally {await pg.close();}
},30000);
