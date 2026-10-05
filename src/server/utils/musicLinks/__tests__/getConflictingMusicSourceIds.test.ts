/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { sql, type SQL } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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
    CREATE TABLE artists (id uuid PRIMARY KEY, spotify text, deezer text, bandcamp text, subvert text, supercollector text, soundcloud text, audius text, mixcloud text);
    ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
    CREATE POLICY app_read ON artists TO mnweb USING (true);
    GRANT SELECT ON artists TO mnweb;
    CREATE TABLE artist_id_mappings (artist_id uuid, platform text, platform_id text, UNIQUE (artist_id, platform), UNIQUE (platform, platform_id));
    CREATE TABLE artist_mapping_exclusions (artist_id uuid, platform text, reason text, UNIQUE (artist_id, platform));
    ALTER TABLE artist_id_mappings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE artist_mapping_exclusions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY app_read ON artist_id_mappings TO mnweb USING (true);
    CREATE POLICY app_read ON artist_mapping_exclusions TO mnweb USING (true);
    GRANT SELECT ON artist_id_mappings,artist_mapping_exclusions TO mnweb;`);
  await pg.exec(readFileSync(path.join(process.cwd(),'drizzle/0036_music_destination_owner_indexes.sql'),'utf8'));
});
beforeEach(async () => {await pg.exec('RESET ROLE; TRUNCATE artists,artist_id_mappings,artist_mapping_exclusions');});
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

it.each(['spotify', 'deezer'])('checks canonical %s ownership without assuming a mapping row exists', async platform => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  const id = platform === 'spotify' ? '3DmaZbBPnKSGnxYRpHobss' : '123';
  const differentId = platform === 'spotify' ? '5RUy3e0zVDPXCvJCA3TUXi' : '456';
  const record = { id: 'catalog', url: `https://${platform === 'spotify' ? 'open.spotify' : 'www.deezer'}.com/artist/${id}`, type: 'profile' };
  await pg.exec(`INSERT INTO artists (id,${platform}) VALUES ('${otherId}','${id}'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [record])).toEqual(['catalog']);
  await pg.exec(`RESET ROLE; TRUNCATE artists; INSERT INTO artists (id,${platform}) VALUES ('${artistId}','${differentId}'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [record])).toEqual(['catalog']);
  await pg.exec(`RESET ROLE; UPDATE artists SET ${platform}='${id}'; SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [record])).toEqual([]);
});

it.each([['bandcamp', 'https://dupes.bandcamp.com/'], ['subvert', 'https://subvert.fm/dupes'], ['supercollector', 'https://release.supercollector.xyz/artist/dupes'], ['soundcloud', 'https://soundcloud.com/dupes'], ['audius', 'https://audius.co/dupes'], ['mixcloud', 'https://www.mixcloud.com/dupes/']])('normalizes legacy canonical %s handles when checking owners', async (platform, url) => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  const record = {id: 'handle', url, type: 'profile'};
  await pg.exec(`INSERT INTO artists (id,${platform}) VALUES ('${otherId}','${platform === 'supercollector' ? ' @DuPes.ETH ' : ' @DuPes '}'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [record])).toEqual(['handle']);
  await pg.exec(`RESET ROLE; UPDATE artists SET id='${artistId}'; SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [record])).toEqual([]);
});
it('keeps canonical Spotify IDs case-sensitive', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  await pg.exec(`INSERT INTO artists (id,spotify) VALUES ('${otherId}','AAAAAAAAAAAAAAAAAAAAAA'); SET ROLE mnweb`);
  expect(await getConflictingMusicSourceIds(artistId, [{id: 'spotify', url: 'https://open.spotify.com/artist/aaaaaaaaaaaaaaaaaaaaaa'}])).toEqual([]);
});

it('uses indexed ownership lookups as mnweb on a large artist directory', async () => {
  const { getConflictingMusicSourceIds } = await import('../getConflictingMusicSourceIds');
  await pg.exec(`
    INSERT INTO artists (id,bandcamp,subvert,supercollector,soundcloud,audius,mixcloud)
    SELECT ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
      'user'||n,'user'||n,'user'||n,'user'||n,'user'||n,'user'||n
    FROM generate_series(2000,43999) n;
    CREATE INDEX IF NOT EXISTS artists_handle_soundcloud_idx ON artists (lower(ltrim(soundcloud,'@')));
    CREATE INDEX IF NOT EXISTS artists_handle_bandcamp_idx ON artists (lower(ltrim(bandcamp,'@')));
    ANALYZE artists;
    SET ROLE mnweb;
  `);
  let lookup: SQL | undefined;
  const capture = jest.spyOn(database,'execute').mockImplementationOnce(async query => {
    lookup = query;
    return (await driver.execute(query)).rows;
  });
  const urls = ['https://absent.bandcamp.com/', 'https://subvert.fm/absent',
    'https://release.supercollector.xyz/artist/absent', 'https://soundcloud.com/absent',
    'https://audius.co/absent', 'https://www.mixcloud.com/absent/'];
  expect(await getConflictingMusicSourceIds(artistId, urls.map((url,id) => ({ id:String(id),url })))).toEqual([]);
  capture.mockRestore();
  const explanation = await driver.execute(sql`explain (analyze, format json) ${lookup!}`);
  const plan = (explanation.rows[0] as any)['QUERY PLAN'][0];
  const scans: string[] = [];
  const visit = (node: any) => {
    if (node['Relation Name'] === 'artists' && node['Node Type'] === 'Seq Scan' && node['Actual Loops'] > 0) scans.push(node['Node Type']);
    (node.Plans ?? []).forEach(visit);
  };
  visit(plan.Plan);
  console.log('Ownership query plan:', { sequentialArtistScans: scans.length, executionMs:plan['Execution Time'] });
  expect(scans).toEqual([]);
});
