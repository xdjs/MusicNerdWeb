/** @jest-environment node */
// Use Node's native loader, matching sourceExtractionMigration.test.ts; PGlite
// dynamically imports its WASM runtime outside Jest's CommonJS VM.
const { PGlite } = process.getBuiltinModule("module").createRequire(__filename)("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const artist = '11111111-1111-4111-8111-111111111111';
const source = '22222222-2222-4222-8222-222222222222';
let db: InstanceType<typeof PGlite>;
const execute = (sql: string) => db.exec(sql);
const scalar = async (sql: string) => (await db.query<Record<string, unknown>>(sql)).rows[0];

beforeAll(async () => {
    db = new PGlite();
    await execute(`
      create role mnweb; create role anon; create role authenticated;
      create table artists (id uuid primary key);
      create table artist_vault_sources (
        id uuid primary key, artist_id uuid not null references artists(id),
        status text not null default 'approved', origin text not null default 'research',
        type text, file_path text, url text not null, title text, snippet text,
        extracted_text text, published_at date,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now()
      );
      create table artist_social_posts (
        id uuid primary key, artist_id uuid not null references artists(id),
        platform text not null default 'instagram', owner_username text not null default 'artist',
        is_own_post boolean not null default true, caption text, url text not null,
        posted_at timestamptz, raw jsonb, like_count integer,
        created_at timestamptz not null default now()
      );
      grant usage on schema public to mnweb;
      grant select, insert, update, delete on artists, artist_vault_sources, artist_social_posts to mnweb;
      insert into artists values ('${artist}');
    `);
    await execute(readFileSync(resolve(process.cwd(), 'drizzle/0039_source_versions.sql'), 'utf8'));
});

afterAll(async () => { await db?.close(); });
beforeEach(async () => {
    await execute(`reset role; delete from artist_vault_sources; delete from artist_social_posts;
      insert into artist_vault_sources(id,artist_id,url,title,extracted_text)
        values('${source}','${artist}','https://artist.example/credits','Original credits','A 🥁 credited passage');
      insert into artist_social_posts(id,artist_id,url,caption,raw)
        values('${source}','${artist}','https://www.instagram.com/p/example/','First caption',
        '{"_musicnerdTranscript":{"version":1,"actor":"apify/instagram-reel-scraper","text":"First speech","fetchedAt":"2026-10-01T00:00:00Z"},"providerSecret":"must-not-retain"}');
      set role mnweb;`);
});

it('retains the exact old approved original in the updating app transaction', async () => {
    await execute(`update artist_vault_sources set extracted_text='Changed passage', title='New title' where id='${source}'`);
    expect(await scalar(`select snapshot->>'extractedText' as text, snapshot->>'title' as title from artist_vault_source_versions`)).toEqual({ text: 'A 🥁 credited passage', title: 'Original credits' });
    expect(await scalar(`select extracted_text from artist_vault_sources`)).toEqual({ extracted_text: 'Changed passage' });
});

it('does not archive timestamps or engagement-only refreshes', async () => {
    await execute(`update artist_vault_sources set updated_at=now()+interval '1 day';
      update artist_social_posts set like_count=99, raw=jsonb_set(raw,'{_musicnerdTranscript,fetchedAt}','"2026-10-02T00:00:00Z"');`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 0 });
    expect(await scalar('select count(*)::int as n from artist_social_post_versions')).toEqual({ n: 0 });
});

it('captures captions and supported speech without retaining arbitrary provider payloads', async () => {
    await execute(`update artist_social_posts set caption='New caption', raw=jsonb_set(raw,'{_musicnerdTranscript,text}','"New speech"')`);
    const row = await scalar('select snapshot from artist_social_post_versions');
    expect(row?.snapshot).toMatchObject({ caption: 'First caption', transcript: { text: 'First speech', actor: 'apify/instagram-reel-scraper' } });
    assert.ok(!JSON.stringify(row).includes('providerSecret'));
});

it('deduplicates the same evidence even if update and retrieval timestamps changed', async () => {
    await execute(`update artist_vault_sources set extracted_text='B';
      update artist_vault_sources set extracted_text='A 🥁 credited passage', updated_at=now()+interval '1 day';
      update artist_vault_sources set extracted_text='C';`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 2 });
});

it('does not retain previously pending or rejected vault evidence', async () => {
    await execute(`update artist_vault_sources set status='pending';`);
    await execute(`reset role; delete from artist_vault_sources;
      insert into artist_vault_sources(id,artist_id,url,extracted_text,status)
        values('${source}','${artist}','https://artist.example','Not approved','pending');
      set role mnweb;
      update artist_vault_sources set status='approved', extracted_text='Approved text';`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 0 });
});

it('keeps a formerly eligible original when approval is revoked', async () => {
    await execute(`update artist_vault_sources set status='rejected'`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 1 });
    // API authorization must still reject current ineligibility; history is not a grant.
});

it('does not archive foreign-owner or reposted social content', async () => {
    await execute(`reset role; delete from artist_social_posts;
      insert into artist_social_posts(id,artist_id,url,caption,is_own_post,raw)
        values('${source}','${artist}','https://example.com/post','Foreign',false,'{}');
      set role mnweb; update artist_social_posts set caption='Changed';
      update artist_social_posts set is_own_post=true, raw='{"isRepost":true}';
      update artist_social_posts set caption='Changed repost';`);
    expect(await scalar('select count(*)::int as n from artist_social_post_versions')).toEqual({ n: 0 });
});

it('rolls back source and retained version together', async () => {
    await execute(`begin; update artist_vault_sources set extracted_text='Rollback'; rollback;`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 0 });
    expect(await scalar('select extracted_text from artist_vault_sources')).toEqual({ extracted_text: 'A 🥁 credited passage' });
});

it('denies app updates/deletes of history and public reads, with RLS enabled', async () => {
    await execute(`update artist_vault_sources set extracted_text='B'`);
    await assert.rejects(execute(`update artist_vault_source_versions set snapshot='{}'`), /permission denied/);
    await assert.rejects(execute('delete from artist_vault_source_versions'), /permission denied/);
    await execute('reset role; set role anon;');
    await assert.rejects(execute('select * from artist_vault_source_versions'), /permission denied/);
    await execute('reset role; set role authenticated;');
    await assert.rejects(execute('select * from artist_social_post_versions'), /permission denied/);
    await execute('reset role;');
    const rows = await db.query(`select relrowsecurity from pg_class where relname in ('artist_vault_source_versions','artist_social_post_versions')`);
    expect(rows.rows).toEqual([{ relrowsecurity: true }, { relrowsecurity: true }]);
});

it('purges retained versions when the source is deleted by the app', async () => {
    await execute(`update artist_vault_sources set extracted_text='B'; update artist_social_posts set caption='B';
      delete from artist_vault_sources; delete from artist_social_posts;`);
    expect(await scalar('select count(*)::int as n from artist_vault_source_versions')).toEqual({ n: 0 });
    expect(await scalar('select count(*)::int as n from artist_social_post_versions')).toEqual({ n: 0 });
});

it('does not commit a source change if its required version capture fails', async () => {
    await execute('reset role; revoke insert on artist_vault_source_versions from mnweb; set role mnweb;');
    try {
        await assert.rejects(execute(`update artist_vault_sources set extracted_text='Must fail'`), /permission denied/);
        expect(await scalar('select extracted_text from artist_vault_sources')).toEqual({ extracted_text: 'A 🥁 credited passage' });
    } finally {
        await execute('reset role; grant insert on artist_vault_source_versions to mnweb; set role mnweb;');
    }
});
