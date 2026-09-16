/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import { eq, type SQL } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

jest.mock('@/server/db/drizzle', () => ({ get db() { return mockDatabase; } }));
jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/services', () => ({ extractArtistId: jest.fn() }));
jest.mock('@/server/utils/artistLinkDiscordNotifier', () => ({ notifyDiscordOfArtistLinkAdded: jest.fn() }));
jest.mock('@/server/utils/analytics/trackServerEvent', () => ({ trackServerEvent: jest.fn() }));

if (!Response.json) {
    Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
}

const { PGlite } = process.getBuiltinModule('module').createRequire(__filename)('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
const client = new PGlite();
const database = drizzle(client, { schema });
function adapt(executor: Pick<typeof database, 'query' | 'insert' | 'update' | 'select' | 'execute'>) {
    return {
        query: executor.query, insert: executor.insert.bind(executor), update: executor.update.bind(executor),
        select: executor.select.bind(executor), execute: async (query: SQL) => (await executor.execute(query)).rows,
    };
}
const mockDatabase = {
    ...adapt(database),
    transaction: (callback: (tx: ReturnType<typeof adapt>) => Promise<unknown>) => database.transaction(tx => callback(adapt(tx))),
};
let POST: typeof import('../route').POST;
let history: typeof import('../../selfEdits/route').GET;
let getLeaderboard: typeof import('@/server/utils/queries/getLeaderboard').getLeaderboard;
let getRecentActivity: typeof import('@/server/utils/queries/activityQueries').getRecentActivity;
let requireAuth: typeof import('@/lib/auth-helpers').requireAuth;
let extractArtistId: typeof import('@/server/utils/services').extractArtistId;
const artistId = '00000000-0000-4000-8000-000000001134';
const userId = '00000000-0000-4000-8000-000000001135';
const otherId = '00000000-0000-4000-8000-000000001136';
const claimId = '00000000-0000-4000-8000-000000001137';
const since = '2026-01-01T00:00:00Z';

beforeAll(async () => {
    jest.resetModules();
    ({ POST } = await import('../route'));
    ({ GET: history } = await import('../../selfEdits/route'));
    ({ getRecentActivity } = await import('@/server/utils/queries/activityQueries'));
    ({ getLeaderboard } = await import('@/server/utils/queries/getLeaderboard'));
    ({ requireAuth } = await import('@/lib/auth-helpers'));
    ({ extractArtistId } = await import('@/server/utils/services'));
    const tables = { users: schema.users, artists: schema.artists, ugcresearch: schema.ugcresearch,
        artistClaims: schema.artistClaims, claimStatus: schema.claimStatus,
        mcpAuditLog: schema.mcpAuditLog };
    await client.exec(`SET TIME ZONE 'UTC'; CREATE FUNCTION uuid_generate_v4() RETURNS uuid LANGUAGE SQL AS 'SELECT gen_random_uuid()';`);
    for (const statement of await generateMigration(generateDrizzleJson({}), generateDrizzleJson(tables))) {
        if (/^CREATE (TABLE|TYPE|UNIQUE INDEX)/.test(statement) || statement.includes('ADD CONSTRAINT')) await client.exec(statement);
    }
    await client.exec('CREATE ROLE mnweb; CREATE ROLE anon; CREATE ROLE authenticated;');
    await client.exec(readFileSync('drizzle/0027_artist_self_edits.sql', 'utf8'));
}, 30000);
afterAll(async () => { await client.close(); });
beforeEach(async () => {
    jest.clearAllMocks();
    await client.exec('TRUNCATE artists, users CASCADE');
    await database.insert(schema.users).values([{ id: userId }, { id: otherId }]);
    await database.insert(schema.artists).values({ id: artistId, name: 'Self Edit Fixture', createdAt: '2020-01-01T00:00:00Z' });
    await database.insert(schema.artistClaims).values({ id: claimId, artistId, userId, status: 'approved' });
    jest.mocked(requireAuth).mockResolvedValue({ authenticated: true, userId, session: { user: { id: userId }, expires: '2099-01-01' } });
    jest.mocked(extractArtistId).mockImplementation(async url => ({ siteName: 'instagram', cardPlatformName: 'Instagram', id: url.split('/').pop()! }));
});
function request(action = 'set', handle = 'first') {
    return new Request('https://test/api/directEditLink', { method: 'POST', body: JSON.stringify({ artistId, action, url: `https://instagram.com/${handle}`, siteName: 'instagram' }) });
}

it('persists additions/updates once, exposes activity and private history, without UGC credit', async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request('set', 'second'))).status).toBe(200);
    expect((await POST(request('set', 'second'))).status).toBe(200);
    expect((await database.query.artists.findFirst())?.instagram).toBe('second');
    const edits = await database.query.artistSelfEdits.findMany();
    expect(edits).toHaveLength(2);
    expect(edits).toEqual(expect.arrayContaining([
        expect.objectContaining({ userId, artistId, oldValue: null, newValue: 'first' }),
        expect.objectContaining({ userId, artistId, oldValue: 'first', newValue: 'second' }),
    ]));
    expect(await database.query.ugcresearch.findMany()).toEqual([]);
    expect(await getLeaderboard()).toEqual([]);
    const events = await getRecentActivity(since);
    expect(events.map(e => e.type).sort()).toEqual(['self_edit_added', 'self_edit_updated']);
    const res = await history(new Request(`https://test/api/selfEdits?userId=${otherId}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 2, entries: [expect.objectContaining({ artistName: 'Self Edit Fixture', newValue: 'second' }), expect.objectContaining({ newValue: 'first' })] });
});

it('keeps removals and unchanged saves out of history and the feed', async () => {
    await database.update(schema.artists).set({ instagram: 'first' });
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request('clear'))).status).toBe(200);
    expect((await database.query.artists.findFirst())?.instagram).toBeNull();
    expect(await database.query.artistSelfEdits.findMany()).toEqual([]);
    expect(await getRecentActivity(since)).toEqual([]);
});

it('rejects an unrelated user without changing the artist', async () => {
    await database.update(schema.artistClaims).set({ userId: otherId });
    expect((await POST(request())).status).toBe(403);
    expect((await database.query.artists.findFirst())?.instagram).toBeNull();
    expect(await database.query.artistSelfEdits.findMany()).toEqual([]);
});

it('rechecks ownership after URL extraction', async () => {
    jest.mocked(extractArtistId).mockImplementationOnce(async () => {
        await database.update(schema.artistClaims).set({ status: 'rejected' });
        return { siteName: 'instagram', id: 'first', cardPlatformName: 'Instagram' };
    });
    expect((await POST(request())).status).toBe(403);
    expect((await database.query.artists.findFirst())?.instagram).toBeNull();
    expect(await database.query.artistSelfEdits.findMany()).toEqual([]);
});

it('does not mislabel non-owner admin maintenance as an artist self-edit', async () => {
    await database.update(schema.users).set({ isAdmin: true }).where(eq(schema.users.id, userId));
    await database.update(schema.artistClaims).set({ userId: otherId });
    expect((await POST(request())).status).toBe(200);
    expect((await database.query.artists.findFirst())?.instagram).toBe('first');
    expect(await database.query.artistSelfEdits.findMany()).toEqual([]);
});

it('rolls back the link when recording its event fails', async () => {
    await client.exec(`ALTER TABLE artist_self_edits ADD CONSTRAINT test_reject CHECK (new_value <> 'first')`);
    try {
        expect((await POST(request())).status).toBe(500);
        expect((await database.query.artists.findFirst())?.instagram).toBeNull();
        expect(await database.query.artistSelfEdits.findMany()).toEqual([]);
    } finally { await client.exec('ALTER TABLE artist_self_edits DROP CONSTRAINT test_reject'); }
});

it('isolates history to the signed-in account and requires authentication', async () => {
    await POST(request());
    jest.mocked(requireAuth).mockResolvedValue({ authenticated: true, userId: otherId, session: { user: { id: otherId }, expires: '2099-01-01' } });
    expect(await (await history(new Request(`https://test/api/selfEdits?userId=${userId}`))).json()).toMatchObject({ total: 0, entries: [] });
    jest.mocked(requireAuth).mockResolvedValue({ authenticated: false, response: Response.json({}, { status: 401 }) });
    expect((await history(new Request('https://test/api/selfEdits'))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
});

it('enforces the migration grants/RLS for server and client roles', async () => {
    await POST(request());
    await client.transaction(async tx => {
        await tx.exec('SET LOCAL ROLE mnweb');
        expect((await tx.query('SELECT * FROM artist_self_edits')).rows).toHaveLength(1);
        await tx.query(`INSERT INTO artist_self_edits (artist_id,user_id,site_name,old_value,new_value,submitted_url)
            VALUES ($1,$2,'instagram','first','second','https://instagram.com/second')`, [artistId,userId]);
    });
    for (const [role, statement] of [
        ['mnweb', "UPDATE artist_self_edits SET new_value = 'third'"],
        ['mnweb', 'DELETE FROM artist_self_edits'],
        ['anon', 'SELECT * FROM artist_self_edits'],
        ['authenticated', 'SELECT * FROM artist_self_edits'],
    ]) {
        await expect(client.transaction(async tx => {
            await tx.exec(`SET LOCAL ROLE ${role}`);
            await tx.exec(statement);
        })).rejects.toThrow(/permission denied/);
    }
});

it('paginates private history, caps out-of-range pages, and validates page inputs', async () => {
    for (let index = 0; index < 12; index++) expect((await POST(request('set', `handle${index}`))).status).toBe(200);
    const first = await (await history(new Request('https://test/api/selfEdits?page=1'))).json();
    const second = await (await history(new Request('https://test/api/selfEdits?page=999'))).json();
    expect(first).toMatchObject({ total: 12, page: 1, pageCount: 2 });
    expect(first.entries).toHaveLength(10);
    expect(second).toMatchObject({ total: 12, page: 2, pageCount: 2 });
    expect(second.entries).toHaveLength(2);
    expect(new Set([...first.entries, ...second.entries].map(entry => entry.id)).size).toBe(12);
    expect((await history(new Request('https://test/api/selfEdits?page=-1'))).status).toBe(400);
});
