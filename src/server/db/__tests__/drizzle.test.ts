jest.mock('@vercel/functions', () => ({ attachDatabasePool: jest.fn() }));
jest.mock('pg', () => ({ Pool: jest.fn().mockImplementation(() => ({ on: jest.fn() })) }));
jest.mock('../createDatabase', () => ({ createDatabase: jest.fn(pool => ({ $client: pool })) }));
jest.mock('@/env', () => ({ SUPABASE_DB_CONNECTION: 'postgres://fixture.invalid/app' }));
jest.unmock('@/server/db/drizzle');

describe('application database transport', () => {
    beforeEach(() => {
        jest.resetModules();
        delete process.env.VERCEL_ENV;
        delete (globalThis as { musicNerdPgPool?: unknown }).musicNerdPgPool;
    });
    afterEach(() => {
        delete process.env.VERCEL_ENV;
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
    it('attaches preview idle cleanup once across reloads, retaining concurrency', async () => {
        process.env.VERCEL_ENV = 'preview';
        const { db } = await import('../drizzle');
        const { attachDatabasePool } = await import('@vercel/functions');
        expect(attachDatabasePool).toHaveBeenCalledTimes(1);
        expect(attachDatabasePool).toHaveBeenCalledWith(db.$client);
        const { Pool } = await import('pg');
        expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 3, idleTimeoutMillis: 5_000 }));
        jest.resetModules();
        const reloaded = await import('../drizzle');
        const helper = await import('@vercel/functions');
        expect(reloaded.db.$client).toBe(db.$client);
        expect(helper.attachDatabasePool).not.toHaveBeenCalled();
    });

    it('leaves production idle policy and lifecycle unchanged', async () => {
        process.env.VERCEL_ENV = 'production';
        await import('../drizzle');
        const { attachDatabasePool } = await import('@vercel/functions');
        const { Pool } = await import('pg');
        expect(attachDatabasePool).not.toHaveBeenCalled();
        expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ max: 3, idleTimeoutMillis: 20_000 }));
    });

});
