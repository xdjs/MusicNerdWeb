/** @jest-environment node */
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { eq, type SQL } from 'drizzle-orm';
import * as schema from '@/server/db/schema';
let getServerAuthSession: typeof import('@/server/auth').getServerAuthSession;
let addArtistData: typeof import('../artistQueries').addArtistData;
let getRecentActivity: typeof import('../activityQueries').getRecentActivity;

// Keep submission, approval, user lookup, link writes, and feed SQL real.
// Only replace the database connection and boundaries outside this contract.
jest.mock('@/server/db/drizzle', () => ({ get db() { return mockDatabase; } }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/services', () => ({
    extractArtistId: jest.fn(async () => ({
        siteName: 'instagram', cardPlatformName: 'Instagram', id: 'activity_fixture',
    })),
}));
jest.mock('@/server/utils/queries/discord', () => ({ sendDiscordMessage: jest.fn() }));
jest.mock('@/server/utils/ugcDiscordNotifier', () => ({ maybePingDiscordForPendingUGC: jest.fn() }));
jest.mock('@/server/utils/artistLinkDiscordNotifier', () => ({ notifyDiscordOfArtistLinkAdded: jest.fn() }));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({}));
jest.mock('@/server/utils/queries/artistBioQuery', () => ({}));

// Load the WASM driver in Node's native module context: its dynamic imports
// cannot run in Jest's CommonJS VM. Application modules still run under Jest.
const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
const mockDatabase = {
    query: database.query,
    insert: database.insert.bind(database),
    update: database.update.bind(database),
    // postgres-js returns iterable rows; PGlite wraps those in a results object.
    // Execute the original SQL unchanged, adapting only the driver result shape.
    execute: async (query: SQL) => (await database.execute(query)).rows,
};
const artistId = '00000000-0000-4000-8000-000000001137';
const userId = '00000000-0000-4000-8000-000000001138';
const submittedUrl = 'https://www.instagram.com/activity_fixture/';
const oldTimestamp = '2020-01-01T00:00:00.000Z';
const roles = [
    { role: 'administrator', isAdmin: true, isWhiteListed: false },
    { role: 'whitelisted user', isAdmin: false, isWhiteListed: true },
];

beforeAll(async () => {
    // Discard the connection mock already loaded by the shared Jest setup.
    jest.resetModules();
    ({ getServerAuthSession } = await import('@/server/auth'));
    ({ addArtistData } = await import('../artistQueries'));
    ({ getRecentActivity } = await import('../activityQueries'));
    // Generate current table DDL instead of replaying historical migrations or
    // maintaining a second copy of the schema. Policies/roles are out of scope.
    const tables = {
        artists: schema.artists, users: schema.users,
        ugcresearch: schema.ugcresearch, mcpAuditLog: schema.mcpAuditLog,
    };
    const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(tables));
    await client.exec(`SET TIME ZONE 'UTC';
        CREATE FUNCTION uuid_generate_v4() RETURNS uuid
        LANGUAGE SQL AS 'SELECT gen_random_uuid()';`);
    for (const statement of statements) {
        if (statement.startsWith('CREATE TABLE') || statement.includes('ADD CONSTRAINT')) {
            await client.exec(statement);
        }
    }
}, 30000);

afterAll(async () => { await client.close(); });

beforeEach(async () => {
    await client.exec('TRUNCATE ugcresearch, mcp_audit_log, artists, users CASCADE');
    await database.insert(schema.artists).values({ id: artistId, name: 'Activity Fixture', createdAt: oldTimestamp });
    await database.insert(schema.users).values({ id: userId, username: 'activity_tester' });
    jest.mocked(getServerAuthSession).mockResolvedValue({ user: { id: userId }, expires: '2099-01-01' });
});

async function loadArtist() {
    const artist = await database.query.artists.findFirst({ where: eq(schema.artists.id, artistId) });
    if (!artist) throw new Error('Missing test artist');
    return artist;
}

it.each(roles)('$role submission persists one approved contribution, link, and feed event', async (role) => {
    await database.update(schema.users).set(role).where(eq(schema.users.id, userId));
    const beforeSubmission = new Date(Date.now() - 1000).toISOString();

    expect(await addArtistData(submittedUrl, await loadArtist())).toMatchObject({ status: 'success' });

    const contributions = await database.query.ugcresearch.findMany();
    expect(contributions).toHaveLength(1);
    const contribution = contributions[0]!;
    expect(contribution).toMatchObject({
        artistId, userId, ugcUrl: submittedUrl, siteName: 'instagram',
        siteUsername: 'activity_fixture', accepted: true,
    });
    expect(contribution.dateProcessed).not.toBeNull();
    const processedAt = Date.parse(contribution.dateProcessed!.replace(' ', 'T') + 'Z');
    expect(processedAt).toBeGreaterThanOrEqual(Date.parse(beforeSubmission));
    expect(processedAt).toBeLessThanOrEqual(Date.now());
    expect((await loadArtist()).instagram).toBe('activity_fixture');

    const events = await getRecentActivity(beforeSubmission);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
        type: 'ugc_approved', artist_id: artistId, artist_name: 'Activity Fixture', platform: 'instagram',
    });
    expect(new Date(events[0]!.created_at).getTime()).toBe(processedAt);
    expect((await getRecentActivity()).filter(event => event.type === 'ugc_approved')).toEqual(events);
    expect(await getRecentActivity(new Date(processedAt).toISOString())).toEqual([]);

    // The supported no-op case uses refreshed profile data, as the UI does.
    expect(await addArtistData(submittedUrl, await loadArtist())).toMatchObject({
        status: 'error', message: 'This artist data has already been added',
    });
    expect(await database.query.ugcresearch.findMany()).toEqual(contributions);
    expect((await loadArtist()).instagram).toBe('activity_fixture');
    expect(await getRecentActivity(beforeSubmission)).toEqual(events);
});

it('keeps a regular user submission pending and absent from accepted activity', async () => {
    expect(await addArtistData(submittedUrl, await loadArtist())).toMatchObject({ status: 'success' });
    const contributions = await database.query.ugcresearch.findMany();
    expect(contributions).toHaveLength(1);
    expect(contributions[0]).toMatchObject({ artistId, userId, accepted: false, dateProcessed: null });
    expect((await loadArtist()).instagram).toBeNull();
    expect((await getRecentActivity()).filter(event => event.type === 'ugc_approved')).toEqual([]);
});

it.each([
    { accepted: false, dateProcessed: '2026-01-01T12:00:00.000Z' },
    { accepted: true, dateProcessed: null },
])('excludes incomplete approval state %j from the real feed query', async (state) => {
    await database.insert(schema.ugcresearch).values({
        artistId, userId, name: 'Activity Fixture', siteName: 'instagram', ...state,
    });
    expect((await getRecentActivity()).filter(event => event.type === 'ugc_approved')).toEqual([]);
});
