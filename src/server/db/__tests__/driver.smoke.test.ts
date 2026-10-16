/** Opt-in disposable PostgreSQL check. Accepts only a loopback port, never a
 * deployed connection string. The cluster must be named local-pg-incident.
 * MUSICNERD_TEST_PG_PORT=55439 npm run test:smoke -- --runInBand driver.smoke
 */
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import type { Socket } from 'node:net';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../createDatabase';
import { artists, users, artistClaims, artistVaultSources, artistActivityEvents, urlmap } from '../schema';

const port = process.env.MUSICNERD_TEST_PG_PORT;
const suite = port ? describe : describe.skip;
suite('node-postgres application compatibility on disposable PostgreSQL', () => {
    let admin: Pool;
    let pool: Pool;
    let db: ReturnType<typeof createDatabase>;
    let created = false;
    const namedStatements: string[] = [];
    const database = `musicnerd_driver_${process.pid}`;
    const artistIds = [randomUUID(), randomUUID(), randomUUID()];
    const owner = randomUUID(), administrator = randomUUID(), stranger = randomUUID();
    let getSources: typeof import('@/server/utils/queries/dashboardQueries').getVaultSourcesByArtistId;
    let lockReview: typeof import('@/server/utils/artistLinkReview/lockLinkReview').lockLinkReview;

    beforeAll(async () => {
        expect(Number(port)).toBeGreaterThan(1024);
        admin = new Pool({ host: '127.0.0.1', port: Number(port), database: 'postgres', user: process.env.USER, max: 1 });
        const result = await admin.query("select current_setting('data_directory') as path");
        expect(basename(result.rows[0].path)).toBe('local-pg-incident');
        await admin.query(`create database ${database}`);
        created = true;
        pool = new Pool({ host: '127.0.0.1', port: Number(port), database, user: process.env.USER, max: 3, pipeline: false });
        pool.on('connect', client => {
            const original = client.query.bind(client);
            jest.spyOn(client, 'query').mockImplementation(((...args: Parameters<typeof client.query>) => {
                const query: unknown = args[0];
                if (query && typeof query === 'object' && 'name' in query && query.name) namedStatements.push(String(query.name));
                return original(...args);
            }) as typeof client.query);
        });
        db = createDatabase(pool);
        await db.execute("create type source_status as enum ('pending','approved','rejected')");
        await db.execute("create type claim_status as enum ('pending','approved','rejected')");
        await db.execute("create type platform_type as enum ('social','web3','listen')");
        // Use the actual column definitions. Constraints/policies are deliberately
        // outside this driver's protocol test; no production DDL is changed.
        for (const table of [artists, users, artistClaims, artistVaultSources, artistActivityEvents, urlmap]) {
            const config = getTableConfig(table);
            await db.execute(sql.raw(`create table "${config.name}" (${config.columns.map(column =>
                `"${column.name}" ${column.getSQLType()}`).join(',')})`));
        }
        await db.insert(users).values([
            { id: owner, username: 'Fixture Owner', isAdmin: false },
            { id: administrator, username: 'Fixture Admin', isAdmin: true },
            { id: stranger, username: 'Fixture Stranger', isAdmin: false },
        ]);
        for (const [index, id] of artistIds.entries()) {
            await db.insert(artists).values({ id, name: `Fixture ${index} Á` });
            await db.insert(artistClaims).values({ id: randomUUID(), artistId: id, userId: owner, status: 'approved' });
            for (const [status, time] of [['approved', '2026-10-14T12:00:00Z'], ['pending', '2026-10-15T12:00:00Z']] as const) {
                await db.insert(artistVaultSources).values({ id: randomUUID(), artistId: id, status,
                    url: `https://example.test/${index}/${status}`, title: `Source ${index} ${status} Á`,
                    extractedText: 'Synthetic fixture. '.repeat(2000), createdAt: time, updatedAt: time });
            }
        }
        jest.doMock('@/server/db/drizzle', () => ({ db }));
        getSources = (await import('@/server/utils/queries/dashboardQueries')).getVaultSourcesByArtistId;
        lockReview = (await import('@/server/utils/artistLinkReview/lockLinkReview')).lockLinkReview;
    });

    afterAll(async () => {
        await pool?.end();
        if (created) await admin.query(`drop database ${database}`);
        await admin?.end();
        jest.dontMock('@/server/db/drizzle');
    });

    it('loads real approved and pending readers repeatedly across three artists alongside unparameterized reads', async () => {
        for (let repeat = 0; repeat < 4; repeat++) {
            await Promise.all(artistIds.map(async (id, index) => {
                const [approved, pending] = await Promise.all([
                    getSources(id, 'approved'), getSources(id, 'pending'),
                    db.query.urlmap.findMany(), db.query.urlmap.findMany(),
                ]);
                expect(approved).toHaveLength(1);
                expect(pending).toHaveLength(1);
                expect(approved[0]).toMatchObject({ artistId: id, status: 'approved', title: `Source ${index} approved Á` });
                expect(pending[0]).toMatchObject({ artistId: id, status: 'pending', title: `Source ${index} pending Á` });
                expect(typeof pending[0].createdAt).toBe('string');
                expect(pending[0].extractedText).toHaveLength(38000);
            }));
        }
        expect(pool.totalCount).toBeLessThanOrEqual(3);
        expect(pool.waitingCount).toBe(0);
        expect(pool.idleCount).toBe(pool.totalCount);
        expect(namedStatements).toEqual([]);
    });

    it('preserves raw row arrays and JSON, timestamp, numeric and array decoding', async () => {
        const rows = await db.execute(sql`select ${'Á'}::text as name, '[1,true]'::jsonb as payload,
            now() as created, 42::bigint as big, 1.25::numeric as amount, array[1,2] as ids`);
        expect(Array.isArray(rows)).toBe(true);
        expect(rows[0]).toMatchObject({ name: 'Á', payload: [1, true], big: '42', amount: '1.25', ids: [1, 2] });
        expect(typeof rows[0].created).toBe('string');
    });

    it('reserves one backend for commit, nested savepoint rollback and outer rollback', async () => {
        await db.execute('create table driver_writes (value text)');
        await db.transaction(async tx => {
            const [start] = await tx.execute(sql`select pg_backend_pid() as pid`);
            await tx.execute(sql`insert into driver_writes values ('committed')`);
            await expect(tx.transaction(async nested => {
                const [inside] = await nested.execute(sql`select pg_backend_pid() as pid`);
                expect(inside.pid).toBe(start.pid);
                await nested.execute(sql`insert into driver_writes values ('nested rollback')`);
                throw new Error('fixture rollback');
            })).rejects.toThrow('fixture rollback');
            const pids = await Promise.all([tx.execute(sql`select pg_backend_pid() as pid`), tx.execute(sql`select pg_backend_pid() as pid`)]);
            expect(pids.map(rows => rows[0].pid)).toEqual([start.pid, start.pid]);
        }, { isolationLevel: 'read committed' });
        await expect(db.transaction(async tx => {
            await tx.execute(sql`insert into driver_writes values ('outer rollback')`);
            throw new Error('outer rollback');
        })).rejects.toThrow('outer rollback');
        expect(await db.execute('select value from driver_writes')).toEqual([{ value: 'committed' }]);
        expect(pool.idleCount).toBe(pool.totalCount);
    });

    it('retains the actual owner/admin authorization guard and rejects unrelated users', async () => {
        for (const id of artistIds) {
            await db.transaction(tx => lockReview(tx, id, owner));
            await db.transaction(tx => lockReview(tx, id, administrator));
            await expect(db.transaction(tx => lockReview(tx, id, stranger))).rejects.toThrow('Artist ownership changed');
        }
        expect(pool.waitingCount).toBe(0);
        expect(pool.idleCount).toBe(pool.totalCount);
    });

    it('returns query errors without poisoning the next pool checkout', async () => {
        await expect(db.execute('select 1 / 0')).rejects.toThrow();
        expect(await db.execute('select 7::int as value')).toEqual([{ value: 7 }]);
        expect(pool.idleCount).toBe(pool.totalCount);
    });

    it('releases pool capacity when BEGIN itself fails', async () => {
        const client = await pool.connect();
        const release = jest.spyOn(client, 'release');
        const query = jest.spyOn(client, 'query');
        (query as jest.Mock).mockRejectedValueOnce(new Error('fixture BEGIN failure'));
        const checkout = jest.spyOn(pool, 'connect');
        (checkout as jest.Mock).mockResolvedValueOnce(client);
        try {
            await expect(db.transaction(async () => 'unreachable')).rejects.toThrow();
            expect(release).toHaveBeenCalledTimes(1);
            expect(await db.execute('select 8::int as value')).toEqual([{ value: 8 }]);
            expect(pool.waitingCount).toBe(0);
            expect(pool.idleCount).toBe(pool.totalCount);
        } finally {
            checkout.mockRestore();
            query.mockRestore();
            // A failing regression must still let the disposable cluster stop.
            if (!release.mock.calls.length) client.release(true);
            release.mockRestore();
        }
    });

    it.each(['BEGIN', 'transaction'])('contains a real socket failure during %s and discards the checkout once', async phase => {
        const client = await pool.connect();
        const before = await client.query('select pg_backend_pid() as pid');
        const release = jest.spyOn(client, 'release');
        const emitted = jest.spyOn(client, 'emit'); // observes events without adding an error listener
        const checkout = jest.spyOn(pool, 'connect');
        (checkout as jest.Mock).mockResolvedValueOnce(client);
        const failure = new Error(`fixture ${phase} socket disconnect`);
        // Destroy the actual local TCP socket, exercising pg's error event and
        // deferred query rejection, rather than mocking a rejected query promise.
        const socket = (client as unknown as { connection: { stream: Socket } }).connection.stream;
        const original = client.query.bind(client);
        const query = jest.spyOn(client, 'query');
        if (phase === 'BEGIN') {
            query.mockImplementationOnce(((...args: Parameters<typeof client.query>) => {
                const request = original(...args);
                queueMicrotask(() => socket.destroy(failure));
                return request;
            }) as typeof client.query);
        }
        try {
            await expect(db.transaction(async tx => {
                if (phase === 'BEGIN') throw new Error('BEGIN failure must not run the callback');
                const pending = tx.execute(sql`select pg_sleep(0.1)`);
                await new Promise<void>(resolve => setImmediate(resolve));
                socket.destroy(failure);
                await pending;
            })).rejects.toThrow();
            expect(emitted).toHaveBeenCalledWith('error', failure);
            expect(release).toHaveBeenCalledTimes(1);
            expect(release).toHaveBeenCalledWith(failure);
            checkout.mockRestore();
            const [healthy] = await db.execute(sql`select pg_backend_pid() as pid, 9::int as value`);
            expect(healthy.value).toBe(9);
            expect(healthy.pid).not.toBe(before.rows[0].pid);
            expect(pool.waitingCount).toBe(0);
            expect(pool.idleCount).toBe(pool.totalCount);
        } finally {
            checkout.mockRestore();
            query.mockRestore();
            if (!release.mock.calls.length) client.release(true);
            release.mockRestore();
            emitted.mockRestore();
        }
    });
});
