/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/pglite';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import type { SQL } from 'drizzle-orm';
import * as schema from '@/server/db/schema';

jest.mock('@/server/db/drizzle', () => ({ get db() { return mockDatabase; } }));
jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));

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
let history: typeof import('../route').GET;
let getRecentActivity: typeof import('@/server/utils/queries/activityQueries').getRecentActivity;
let requireAuth: typeof import('@/lib/auth-helpers').requireAuth;
const artistId = '00000000-0000-4000-8000-000000001134';
const userId = '00000000-0000-4000-8000-000000001135';
const otherId = '00000000-0000-4000-8000-000000001136';
const claimId = '00000000-0000-4000-8000-000000001137';
const since = '2026-01-01T00:00:00Z';

beforeAll(async () => {
    jest.resetModules();
    ({ GET: history } = await import('../route'));
    ({ getRecentActivity } = await import('@/server/utils/queries/activityQueries'));
    ({ requireAuth } = await import('@/lib/auth-helpers'));
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
});
// Reader integration fixtures are inserted directly. API integration tests own
// authenticated mutation, idempotence, claim revalidation and write rollback.
async function seedHistory(newValue: string, oldValue: string | null = null, createdAt = '2026-10-01T00:00:00Z') {
    await database.insert(schema.artistSelfEdits).values({
        artistId, userId, siteName: 'instagram', oldValue, newValue,
        submittedUrl: `https://instagram.com/${newValue}`, createdAt,
    });
}

it('reads addition/update history and activity without counting it as UGC credit', async () => {
    await seedHistory('first', null, '2026-10-01T00:00:00Z');
    await seedHistory('second', 'first', '2026-10-02T00:00:00Z');
    expect(await database.query.ugcresearch.findMany()).toEqual([]);
    const events = await getRecentActivity(since);
    expect(events.map(e => e.type).sort()).toEqual(['self_edit_added', 'self_edit_updated']);
    const res = await history(new Request(`https://test/api/selfEdits?userId=${otherId}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 2, entries: [expect.objectContaining({ artistName: 'Self Edit Fixture', newValue: 'second' }), expect.objectContaining({ newValue: 'first' })] });
});

it('isolates history to the signed-in account and requires authentication', async () => {
    await seedHistory('first');
    jest.mocked(requireAuth).mockResolvedValue({ authenticated: true, userId: otherId, session: { user: { id: otherId }, expires: '2099-01-01' } });
    expect(await (await history(new Request(`https://test/api/selfEdits?userId=${userId}`))).json()).toMatchObject({ total: 0, entries: [] });
    jest.mocked(requireAuth).mockResolvedValue({ authenticated: false, response: Response.json({}, { status: 401 }) });
    expect((await history(new Request('https://test/api/selfEdits'))).status).toBe(401);
});

it('enforces the migration grants/RLS for server and client roles', async () => {
    await seedHistory('first');
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
    for (let index = 0; index < 12; index++) await seedHistory(`handle${index}`);
    const first = await (await history(new Request('https://test/api/selfEdits?page=1'))).json();
    const second = await (await history(new Request('https://test/api/selfEdits?page=999'))).json();
    expect(first).toMatchObject({ total: 12, page: 1, pageCount: 2 });
    expect(first.entries).toHaveLength(10);
    expect(second).toMatchObject({ total: 12, page: 2, pageCount: 2 });
    expect(second.entries).toHaveLength(2);
    expect(new Set([...first.entries, ...second.entries].map(entry => entry.id)).size).toBe(12);
    expect((await history(new Request('https://test/api/selfEdits?page=-1'))).status).toBe(400);
});
