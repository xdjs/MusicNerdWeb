/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/server/db/schema';
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
jest.mock('@/server/db/drizzle', () => ({ get db() { return database; } }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn(async () => ({ user: { id: 'owner' } })) }));
jest.mock('@/server/utils/dev-auth', () => ({ getDevSession: jest.fn(async () => null) }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn(async () => true) }));
jest.mock('@/server/utils/musicPlatform/getProviderPhoto', () => ({ getProviderPhoto: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn(async () => null) }));
jest.mock('@/server/utils/artistOperationContext', () => ({ withArtistOperation: jest.fn((_id, _auth, fn) => fn()) }));
jest.mock('@/server/utils/queries/ownershipWrites', () => ({ withScopedArtistWrite: jest.fn(), OwnershipChangedError: class extends Error {} }));
let PATCH: typeof import('../route').PATCH;
let withScopedArtistWrite: typeof import('@/server/utils/queries/ownershipWrites').withScopedArtistWrite;
let getProviderPhoto: typeof import('@/server/utils/musicPlatform/getProviderPhoto').getProviderPhoto;
if (!Response.json) Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init);
const bike = '00000000-0000-4000-8000-000000000001';
const pete = '00000000-0000-4000-8000-000000000002';
const image = 'https://i.scdn.co/image/ab6761610000e5eb082c9de8bc6a6e4fbc5c808b';
const migration = readFileSync('scripts/release/preserve-bike-lane-portrait.sql', 'utf8');
beforeAll(async () => {
    jest.resetModules();
    ({ PATCH } = await import('../route'));
    ({ withScopedArtistWrite } = await import('@/server/utils/queries/ownershipWrites'));
    ({ getProviderPhoto } = await import('@/server/utils/musicPlatform/getProviderPhoto'));
    const { generateDrizzleJson, generateMigration } = await import('drizzle-kit/api');
    await client.exec("CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';");
    for (const statement of await generateMigration(generateDrizzleJson({}), generateDrizzleJson({ artists: schema.artists }))) {
        if (statement.startsWith('CREATE TABLE')) await client.exec(statement);
    }
    await client.exec('CREATE ROLE mnweb; GRANT SELECT, UPDATE ON artists TO mnweb; ALTER TABLE artists ENABLE ROW LEVEL SECURITY; CREATE POLICY app ON artists TO mnweb USING (true) WITH CHECK (true)');
}, 30000);
beforeEach(async () => {
    await client.exec('RESET ROLE; DELETE FROM artists');
    await database.insert(schema.artists).values([
        { id: bike, name: 'Bike Lane', spotify: '4hmP7SKOIhC8e1PZo8UG7f', headerImagePosition: { imageUrl: image, y: 35 } },
        { id: pete, name: 'Pete Rango', customImage: 'https://storage.example/pete.png', headerImagePosition: { imageUrl: 'https://storage.example/pete.png', y: 60 }, spotify: 'pete' },
    ]);
    jest.mocked(getProviderPhoto).mockResolvedValue(image);
    jest.mocked(withScopedArtistWrite).mockImplementation(async (_id, fn) => fn(database as never));
});
afterAll(async () => { await client.close(); });
it('pins only Bike Lane, preserves Pete and both crops, and is idempotent through the app role', async () => {
    await client.exec('SET ROLE mnweb');
    await client.exec(migration); await client.exec(migration);
    const rows = await database.select().from(schema.artists);
    expect(rows.find(r => r.id === bike)).toMatchObject({ customImage: image, headerImagePosition: { imageUrl: image, y: 35 } });
    expect(rows.find(r => r.id === pete)).toMatchObject({ customImage: 'https://storage.example/pete.png', headerImagePosition: { y: 60 } });
    await client.query('UPDATE artists SET custom_image=$1 WHERE id=$2', ['https://storage.example/bike-new.png', bike]);
    await client.exec(migration);
    expect((await client.query<{ custom_image: string }>('SELECT custom_image FROM artists WHERE id=$1', [bike])).rows[0]?.custom_image).toBe('https://storage.example/bike-new.png');
});
it('persists server-selected image, retains matching crop, then rejects stale writes', async () => {
    await client.exec('SET ROLE mnweb');
    const body = { artistId: bike, source: 'spotify', providerId: '4hmP7SKOIhC8e1PZo8UG7f', imageUrl: image, expectedCustomImage: null };
    const req = () => new Request('https://example.test', { method: 'PATCH', body: JSON.stringify(body) });
    expect((await PATCH(req())).status).toBe(200);
    expect((await database.select().from(schema.artists)).find(r => r.id === bike)).toMatchObject({ customImage: image, headerImagePosition: { y: 35 } });
    expect((await PATCH(req())).status).toBe(409);
});
it('clears a crop belonging to a different image', async () => {
    await client.exec('SET ROLE mnweb');
    const res = await PATCH(new Request('https://example.test', { method: 'PATCH', body: JSON.stringify({ artistId: pete, source: 'spotify', providerId: 'pete', imageUrl: image, expectedCustomImage: 'https://storage.example/pete.png' }) }));
    expect(res.status).toBe(200);
    expect((await database.select().from(schema.artists)).find(r => r.id === pete)?.headerImagePosition).toBeNull();
});
