/** @jest-environment node */
import type { SQL } from 'drizzle-orm';

// The shared test setup installs a Response polyfill without the static helper.
if (!Response.json) {
    Response.json = (data: unknown, init?: ResponseInit) => {
        const headers = new Headers(init?.headers);
        headers.set('Content-Type', 'application/json');
        return new Response(JSON.stringify(data), { ...init, headers });
    };
}

describe('GET /api/health', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.doMock('@/env', () => ({ SUPABASE_DB_CONNECTION: 'configured' }));
    });

    it('checks the candidate application database with a read-only query', async () => {
        const { db } = await import('@/server/db/drizzle');
        jest.mocked(db.execute).mockResolvedValue([{ result: 1 }]);
        const { GET, dynamic } = await import('../route');
        const { PgDialect } = await import('drizzle-orm/pg-core');

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true, checks: { database: true } });
        expect(dynamic).toBe('force-dynamic');
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(db.execute).toHaveBeenCalledTimes(1);
        expect(new PgDialect().sqlToQuery(jest.mocked(db.execute).mock.calls[0][0] as SQL))
            .toMatchObject({ sql: 'select 1', params: [] });
    });

    it.each(['', '   '])('fails closed with a missing connection (%j), without using pg defaults', async connection => {
        jest.doMock('@/env', () => ({ SUPABASE_DB_CONNECTION: connection }));
        const { db } = await import('@/server/db/drizzle');
        const { GET } = await import('../route');

        const response = await GET();

        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ ok: false, checks: { database: false } });
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(db.execute).not.toHaveBeenCalled();
    });

    it('fails closed for invalid credentials without returning or logging provider details', async () => {
        const { db } = await import('@/server/db/drizzle');
        jest.mocked(db.execute).mockRejectedValue(new Error('postgres://private:secret@private-host/database'));
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        const { GET } = await import('../route');

        try {
            const response = await GET();
            expect(response.status).toBe(503);
            expect(await response.json()).toEqual({ ok: false, checks: { database: false } });
            expect(log).not.toHaveBeenCalled();
        } finally {
            log.mockRestore();
        }
    });

    it('queries again instead of retaining a previous healthy result', async () => {
        const { db } = await import('@/server/db/drizzle');
        jest.mocked(db.execute).mockResolvedValueOnce([{ result: 1 }])
            .mockRejectedValueOnce(new Error('connection refused'));
        const { GET } = await import('../route');

        expect((await GET()).status).toBe(200);
        expect((await GET()).status).toBe(503);
        expect(db.execute).toHaveBeenCalledTimes(2);
    });
});
