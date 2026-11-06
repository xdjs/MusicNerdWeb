/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { eq, type SQL } from 'drizzle-orm';
import * as schema from '@/server/db/schema';
let withArtistOperation: typeof import('@/server/utils/artistOperationContext').withArtistOperation;
let setArtistLink: typeof import('@/server/utils/artistLinks/setArtistLink').setArtistLink;
let setAutomaticCatalogLink: typeof import('../setAutomaticCatalogLink').setAutomaticCatalogLink;
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const originalFetch = global.fetch;
jest.mock('@/server/db/drizzle', () => ({ get db() { return adapter; } }));
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: async () => stored() }));
// Synthetic schema/RLS fixtures; real Drizzle, locks, ownership, collision and write SQL.
// All external evidence is intercepted. No credentials, workers or provider calls.
const client = new PGlite();
const database = drizzle(client, { schema });
function adapt(executor: Pick<typeof database, "query" | "execute">) {
  return { query: executor.query, execute: async (q: SQL) => (await executor.execute(q)).rows };
}
const adapter = {
  ...adapt(database),
  transaction: (fn: (tx: ReturnType<typeof adapt>) => Promise<unknown>) =>
    database.transaction(tx => fn(adapt(tx))),
};
const artistId = "00000000-0000-4000-8000-000000001580";
const userId = "00000000-0000-4000-8000-000000001581";
const claimId = "00000000-0000-4000-8000-000000001582";
const otherId = "00000000-0000-4000-8000-000000001583";
const spotify = "A".repeat(22);
const url = "https://www.deezer.com/artist/87797542";
const tables = [
  schema.artists,
  schema.users,
  schema.artistClaims,
  schema.artistIdMappings,
  schema.artistResearchJobs,
];
const run = (platform: 'spotify' | 'deezer', automatic = true) =>
  withArtistOperation(artistId, { userId, expectedClaimId: claimId }, () =>
    automatic ? setAutomaticCatalogLink(artistId, platform, platform === 'spotify' ? spotify : '87797542')
      : setArtistLink(artistId, platform, platform === 'spotify' ? spotify : '87797542'));
const stored = async () =>
  (await database.select().from(schema.artists).where(eq(schema.artists.id, artistId)))[0];
beforeAll(async () => {
  jest.resetModules();
  ({ withArtistOperation } = await import('@/server/utils/artistOperationContext'));
  ({ setArtistLink } = await import('@/server/utils/artistLinks/setArtistLink'));
  ({ setAutomaticCatalogLink } = await import('../setAutomaticCatalogLink'));
  await client.exec(
    "CREATE ROLE mnweb; CREATE TYPE claim_status AS ENUM ('pending','approved','rejected'); CREATE TYPE confidence_level AS ENUM ('high','medium','low')",
  );
  for (const table of tables) {
    const config = getTableConfig(table);
    await client.exec(
      `CREATE TABLE "${config.name}" (${config.columns.map(c => `"${c.name}" ${c.getSQLType()}`).join(",")}); ALTER TABLE "${config.name}" ENABLE ROW LEVEL SECURITY; CREATE POLICY fixture_app ON "${config.name}" TO mnweb USING (true) WITH CHECK (true); GRANT SELECT, INSERT, UPDATE ON "${config.name}" TO mnweb;`,
    );
  }
  // Mirrors the Web-owned unique identity contracts; not full migration replay.
  await client.exec(
    "ALTER TABLE artists ADD PRIMARY KEY (id); ALTER TABLE artist_id_mappings ADD FOREIGN KEY (artist_id) REFERENCES artists(id); CREATE UNIQUE INDEX artists_deezer_uniq ON artists(deezer) WHERE deezer IS NOT NULL; CREATE UNIQUE INDEX artist_id_mappings_platform_id_uniq ON artist_id_mappings(platform,platform_id); CREATE UNIQUE INDEX artist_id_mappings_artist_platform_uniq ON artist_id_mappings(artist_id,platform)",
  );
  await client.exec(
    "ALTER TABLE artist_research_jobs ADD CONSTRAINT artist_research_jobs_kind_check CHECK (kind IN ('social_ingest', 'caption_extract', 'lore_refresh', 'source_search', 'latest_refresh', 'source_extract', 'question_research', 'spotify_match'))",
  );
}, 30000);
beforeEach(async () => {
  await client.exec(
    "RESET ROLE; TRUNCATE artists,users,artist_claims,artist_id_mappings,artist_research_jobs",
  );
  await database
    .insert(schema.artists)
    .values({ id: artistId, name: "Synthetic stage alias", spotify });
  await database.insert(schema.users).values({ id: userId, isAdmin: false });
  await database
    .insert(schema.artistClaims)
    .values({ id: claimId, artistId, userId, status: "approved" });
  await client.exec(
    `INSERT INTO artist_research_jobs(id,artist_id,kind,status,state) VALUES ('${otherId}','${artistId}','spotify_match','pending','{}')`,
  );
  await client.exec("SET ROLE mnweb");
  Object.assign(global, { fetch: jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          bindings: [
            {
              item: { value: "https://www.wikidata.org/entity/Q1" },
              sourceId: { value: spotify },
              targetId: { value: "87797542" },
            },
          ],
        },
      }),
    }) });
});
afterEach(() => { global.fetch = originalFetch; });
afterAll(async () => {
  await client.close();
});

describe.each(['spotify', 'deezer'] as const)('%s attachment', platform => {
  beforeEach(async () => {
    await database.update(schema.artists).set(platform === 'spotify'
      ? { spotify: null, deezer: '87797542' } : { spotify, deezer: null });
  });
  it('writes the exact corroborated pair and cancels the pending matcher', async () => {
    await run(platform);
    expect((await stored())[platform]).toBe(platform === 'spotify' ? spotify : '87797542');
    expect((await client.query('select status from artist_research_jobs')).rows).toEqual([{status: 'done'}]);
  });
  it('rejects missing reciprocal evidence without cancelling jobs', async () => {
    (fetch as jest.Mock).mockResolvedValue({ok: true, json: async () => ({results: {bindings: []}})});
    await expect(run(platform)).rejects.toThrow('reciprocal evidence');
    expect((await stored())[platform]).toBeNull();
    expect((await client.query('select status from artist_research_jobs')).rows).toEqual([{status: 'pending'}]);
  });
  it('preserves a different existing target', async () => {
    const value = platform === 'spotify' ? 'B'.repeat(22) : '1234';
    await database.update(schema.artists).set({[platform]: value});
    await expect(run(platform)).rejects.toThrow('cannot replace');
    expect((await stored())[platform]).toBe(value);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['spotify', 'deezer'] as const)('rejects an intervening %s edit during verification', async changed => {
    const response = await fetch('intercepted');
    (fetch as jest.Mock).mockImplementationOnce(async () => {
      await database.update(schema.artists).set({[changed]: changed === 'spotify' ? 'B'.repeat(22) : '1234'});
      return response;
    });
    await expect(run(platform)).rejects.toThrow('changed during automatic');
    expect((await client.query('select status from artist_research_jobs')).rows).toEqual([{status: 'pending'}]);
  });
  it('explicit confirmation needs no opposite anchor or external corroboration', async () => {
    await database.update(schema.artists).set({spotify: null, deezer: null});
    await run(platform, false);
    expect((await stored())[platform]).toBe(platform === 'spotify' ? spotify : '87797542');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([true, false])('retains ownership checks (automatic=%s)', async automatic => {
    await database.update(schema.artistClaims).set({status: 'rejected'});
    await expect(run(platform, automatic)).rejects.toThrow('ownership changed');
    expect((await stored())[platform]).toBeNull();
  });
  it.each(['direct', 'mapping', 'own mapping'])('explicit confirmation retains %s collisions', async kind => {
    const value = platform === 'spotify' ? spotify : '87797542';
    await database.insert(schema.artists).values({id: otherId, name: 'Other', ...(kind === 'direct' ? {[platform]: value} : {})});
    if (kind !== 'direct') await database.insert(schema.artistIdMappings).values({id: otherId, source: 'synthetic', confidence: 'high',
      artistId: kind === 'own mapping' ? artistId : otherId, platform,
      platformId: kind === 'own mapping' ? 'different' : value});
    await expect(run(platform, false)).rejects.toThrow(/different artist|mapping/);
    expect((await stored())[platform]).toBeNull();
  });
});
