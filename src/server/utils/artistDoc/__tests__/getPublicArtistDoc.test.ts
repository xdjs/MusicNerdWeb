/** @jest-environment node */
import { createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/pglite';
let getPublicArtistDoc: typeof import('../getPublicArtistDoc').getPublicArtistDoc;
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const driver = drizzle(client);
const database = { execute: async (query: Parameters<typeof driver.execute>[0]) => (await driver.execute(query)).rows };
const artist = '00000000-0000-4000-8000-000000000001';
const source = '00000000-0000-4000-8000-000000000002';
const url = 'https://artist.example/bio';
const revision = createHash('sha256').update(JSON.stringify([url,source,null,'submission','inherit','Original source',null,null,null,null])).digest('hex');
const manifest = [{id:1,kind:'vault',label:'Original',url,revision}];
beforeAll(async () => {
 jest.resetModules();
 ({ getPublicArtistDoc } = await import('../getPublicArtistDoc'));
 await client.exec(`create table artist_claims(artist_id uuid,status text);
 create table artist_docs(artist_id uuid,content text,sources jsonb,updated_at timestamptz);
 create table artist_vault_sources(id uuid,artist_id uuid,activity_id uuid,origin text,publication text,status text,url text,extracted_text text,title text,snippet text,published_at text,file_path text);`);
});
afterAll(() => client.close());
beforeEach(async () => {
 await client.exec('truncate artist_claims,artist_docs,artist_vault_sources');
 await client.query("insert into artist_claims values($1,'approved')",[artist]);
 await client.query("insert into artist_docs values($1,'Stored Lore [1]',$2,now())",[artist,JSON.stringify(manifest)]);
 await client.query("insert into artist_vault_sources(id,artist_id,origin,publication,status,url,extracted_text) values($1,$2,'submission','inherit','approved',$3,'Original source')",[source,artist,url]);
});
it('serves a current document only while the claim and source remain eligible', async () => {
 expect(await getPublicArtistDoc(artist)).toMatchObject({content:'Stored Lore [1]',sources:manifest});
});
it.each(["publication='private'", "status='rejected'", "status='pending'", "extracted_text='Changed'", "activity_id=gen_random_uuid()", "id=gen_random_uuid()"] )('hides the entire cached document after %s', async change => {
 await client.exec(`update artist_vault_sources set ${change}`);
 expect(await getPublicArtistDoc(artist)).toBeNull();
});
it('hides removed sources', async () => {
 await client.exec('delete from artist_vault_sources');
 expect(await getPublicArtistDoc(artist)).toBeNull();
});
it('hides legacy manifests without revisions even with a still-approved source', async () => {
 await client.query('update artist_docs set sources=$1',[JSON.stringify([{id:1,kind:'vault',label:'Original',url}])]);
 expect(await getPublicArtistDoc(artist)).toBeNull();
});
it('does not publish unclaimed documents even with explicitly public sources', async () => {
 await client.exec("delete from artist_claims; update artist_vault_sources set publication='public'");
 expect(await getPublicArtistDoc(artist)).toBeNull();
});
it('does not expose an empty or malformed evidence manifest', async () => {
 for (const sources of [[],{},[{kind:'vault',url}], [{kind:'unknown'}]]) {
  await client.query('update artist_docs set sources=$1',[JSON.stringify(sources)]);
  expect(await getPublicArtistDoc(artist)).toBeNull();
 }
});
it('propagates read failures for the route to return unavailable', async () => {
 const error = new Error('offline');
 await expect(getPublicArtistDoc(artist,{execute:jest.fn().mockRejectedValue(error)} as never)).rejects.toThrow('offline');
});
it.each([
 'https://user:password@example.org/source',
 'https://example.org/source?token=private',
 'https://example.org/source?X-Amz-Signature=private',
 'https://example.org/source?api_key=private',
 'https://example.org/source?secret=private',
 'javascript:alert(1)',
])('hides the whole document when any citation has an unsafe URL: %s', async unsafe => {
 await client.query('update artist_docs set sources=$1', [JSON.stringify([...manifest,{id:2,kind:'social',label:'Source',url:unsafe}])]);
 expect(await getPublicArtistDoc(artist)).toBeNull();
});
it('preserves interview citations with null URLs and safe public links', async () => {
 const sources = [...manifest,{id:2,kind:'interview',label:'Their words',url:null},{id:3,kind:'social',label:'Post',url:'https://example.org/post?view=public'}];
 await client.query('update artist_docs set sources=$1', [JSON.stringify(sources)]);
 expect(await getPublicArtistDoc(artist)).toMatchObject({sources});
});
