jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ on: jest.fn() })) }));
jest.mock('../createDatabase', () => ({ createDatabase: jest.fn(pool => ({ $client: pool })) }));
jest.mock('@/env', () => ({ SUPABASE_DB_CONNECTION: 'postgres://fixture.invalid/app' }));
jest.unmock('@/server/db/drizzle');

describe('application database transport', () => {
    beforeEach(() => {
        jest.resetModules();
        delete (globalThis as { musicNerdPgPool?: unknown }).musicNerdPgPool;
    });
    afterEach(() => {
        delete (globalThis as { musicNerdPgPool?: unknown }).musicNerdPgPool;
    });

    it('uses the configured endpoint, bounded pool and explicitly disabled pipelining', async () => {
        await import('../drizzle');
        const { Pool } = await import('pg');
        expect(Pool).toHaveBeenCalledWith({
            connectionString: 'postgres://fixture.invalid/app', pipeline: false, max: 3,
            idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000,
        });
    });

    it('reuses the pool across development reloads without extra error listeners', async () => {
        const { db } = await import('../drizzle');
        jest.resetModules();
        const reloaded = await import('../drizzle');
        const { Pool } = await import('pg');
        expect(reloaded.db.$client).toBe(db.$client);
        expect(Pool).not.toHaveBeenCalled();
        expect(db.$client.on).toHaveBeenCalledTimes(1);
    });
});
