/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import type { SQL } from 'drizzle-orm';
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite');
let pg: any;
let driver: ReturnType<typeof drizzle>;
const database = { execute: async (query: SQL) => (await driver.execute(query)).rows };
const artistId = '00000000-0000-4000-8000-000000001273';
const otherId = '00000000-0000-4000-8000-000000001274';
const source = {id:'apple',url:'https://music.apple.com/us/artist/pete-rango/1513734272',type:'profile'};
beforeAll(async () => {
  jest.resetModules();
  pg = new PGlite(); driver = drizzle(pg);
  await pg.exec(`CREATE ROLE mnweb;
    CREATE TABLE artist_id_mappings (artist_id uuid, platform text, platform_id text);
    CREATE TABLE artist_mapping_exclusions (artist_id uuid, platform text, reason text);
    ALTER TABLE artist_id_mappings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_mapping_exclusions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY app_read ON artist_id_mappings TO mnweb USING (true);
    CREATE POLICY app_read ON artist_mapping_exclusions TO mnweb USING (true);
    GRANT SELECT ON artist_id_mappings,artist_mapping_exclusions TO mnweb;`);
});
beforeEach(async () => {await pg.exec('RESET ROLE; TRUNCATE artist_id_mappings,artist_mapping_exclusions');});
afterAll(async () => {await pg.close();});
it('suppresses a legacy approved profile that conflicts with the established artist identity', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  await pg.exec(`INSERT INTO artist_id_mappings VALUES ('${artistId}','apple_music','1330310245'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId,[source,{id:'release',url:'https://music.apple.com/us/album/rush/123'}])).toEqual(['apple']);
});
it('allows the matching mapping and ignores unrelated artist mappings', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  await pg.exec(`INSERT INTO artist_id_mappings VALUES ('${artistId}','apple_music','1513734272'),('${otherId}','apple_music','123'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId,[source])).toEqual([]);
});
it('suppresses a catalog ID belonging to another artist or a rejected platform', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  await pg.exec(`INSERT INTO artist_id_mappings VALUES ('${otherId}','apple_music','1513734272'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId,[source])).toEqual(['apple']);
  await pg.exec(`RESET ROLE; TRUNCATE artist_id_mappings; INSERT INTO artist_mapping_exclusions VALUES ('${artistId}','apple_music','name_mismatch'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId,[source])).toEqual(['apple']);
});
it('fails closed for artist profiles when the identity read is unavailable', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  const spy=jest.spyOn(database,'execute').mockRejectedValueOnce(new Error('unavailable'));
  expect(await getConflictingMusicSourceIds(artistId,[source,{id:'release',url:'https://www.beatport.com/track/rush/123'}])).toEqual(['apple']);
  spy.mockRestore();
});
