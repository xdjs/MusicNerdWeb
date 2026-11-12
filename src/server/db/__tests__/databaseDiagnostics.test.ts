/** @jest-environment node */
import { EventEmitter } from 'node:events';
import { Pool } from 'pg';
import { installDatabaseDiagnostics } from '../installDatabaseDiagnostics';
import { buildDatabaseFailureDiagnostic } from '../buildDatabaseFailureDiagnostic';

jest.unmock('pg');
const failure = Object.assign(new Error('postgres://private:secret@host/db SELECT private'), { code: 'EAUTHTIMEOUT' });
let log: jest.SpyInstance;
beforeEach(() => { log = jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

it('allowlists codes and never serializes error text, cause, SQL or arbitrary counters', () => {
    const pool = { totalCount: 3, idleCount: 0, waitingCount: 2 };
    expect(buildDatabaseFailureDiagnostic(failure, pool)).toEqual({ event: 'database_idle_connection_error', code: 'EAUTHTIMEOUT', pool: { total: 3, idle: 0, waiting: 2 } });
    for (const error of [null, undefined, 'EAUTHTIMEOUT', { code: failure.message, cause: failure }, { get code() { throw failure; } }]) {
        expect(buildDatabaseFailureDiagnostic(error, pool).code).toBe('unknown');
    }
    expect(buildDatabaseFailureDiagnostic(failure, { totalCount: NaN, idleCount: -1, waitingCount: Infinity }).pool).toEqual({ total: null, idle: null, waiting: null });
});

it('preserves callback arguments, return value, receiver, success and thrown callback errors', () => {
    const client = {}, release = jest.fn();
    let callback!: (...args: unknown[]) => void;
    const pool = Object.assign(new EventEmitter(), { totalCount: 1, idleCount: 0, waitingCount: 0, connect: jest.fn(function(this: unknown, cb) { expect(this).toBe(pool); callback = cb; }) });
    installDatabaseDiagnostics(pool as unknown as Pool);
    const consumer = jest.fn();
    expect(pool.connect(consumer)).toBeUndefined();
    callback(undefined, client, release);
    expect(consumer).toHaveBeenCalledWith(undefined, client, release);
    expect(log).not.toHaveBeenCalled();
    pool.connect(() => { throw failure; });
    expect(() => callback(undefined, client, release)).toThrow(failure);
    expect(log).not.toHaveBeenCalled();
    pool.connect(consumer);
    callback(failure, undefined, release);
    expect(consumer).toHaveBeenLastCalledWith(failure, undefined, release);
    expect(log).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
});

it('preserves promise success, rejection identity and logger failure without retries', async () => {
    const client = { release: jest.fn() };
    const original = jest.fn().mockResolvedValueOnce(client).mockRejectedValueOnce(failure);
    const pool = Object.assign(new EventEmitter(), { totalCount: 1, idleCount: 0, waitingCount: 0, connect: original });
    installDatabaseDiagnostics(pool as unknown as Pool);
    await expect(pool.connect()).resolves.toBe(client);
    log.mockImplementation(() => { throw new Error('logger failed'); });
    await expect(pool.connect()).rejects.toBe(failure);
    expect(original).toHaveBeenCalledTimes(2);
    expect(client.release).not.toHaveBeenCalled();
});

it('observes actual pg acquisition failures through both overloads and pool.query without a socket', async () => {
    class FailingClient extends EventEmitter {
        connect(callback: (error: Error) => void) { process.nextTick(() => callback(failure)); }
        end(callback?: () => void) { callback?.(); }
    }
    const pool = new Pool({ Client: FailingClient, max: 1 } as never);
    installDatabaseDiagnostics(pool);
    await expect(pool.connect()).rejects.toBe(failure);
    await new Promise<void>(resolve => pool.connect(error => { expect(error).toBe(failure); resolve(); }));
    await expect(pool.query('SELECT private')).rejects.toBe(failure);
    expect(pool.totalCount).toBe(0);
    expect(pool.waitingCount).toBe(0);
    expect(log).toHaveBeenCalledTimes(3);
    for (const [, diagnostic] of log.mock.calls) {
        expect(diagnostic.event).toBe('database_acquisition_error');
        expect(diagnostic.poolAtStart).toEqual({ total: 0, idle: 0, waiting: 0 });
    }
    expect(JSON.stringify(log.mock.calls)).not.toContain('private');
    await pool.end();
});

it('records idle events without throwing when diagnostics fail', () => {
    const pool = Object.assign(new EventEmitter(), { totalCount: 1, idleCount: 1, waitingCount: 0, connect: jest.fn() });
    installDatabaseDiagnostics(pool as unknown as Pool);
    pool.emit('error', failure);
    expect(log.mock.calls[0][1].event).toBe('database_idle_connection_error');
    log.mockImplementation(() => { throw failure; });
    expect(() => pool.emit('error', failure)).not.toThrow();
});

it('distinguishes local saturation snapshots and retains real pg queue and idle cleanup', async () => {
    class LocalClient extends EventEmitter {
        _queryable = true;
        connect(callback: () => void) { process.nextTick(callback); }
        end(callback?: () => void) { callback?.(); }
    }
    const pool = new Pool({ Client: LocalClient, max: 1, connectionTimeoutMillis: 10 } as never);
    installDatabaseDiagnostics(pool);
    const client = await pool.connect();
    try {
        await expect(pool.connect()).rejects.toThrow('timeout exceeded when trying to connect');
        expect(log.mock.calls[0][1]).toMatchObject({ event: 'database_acquisition_error', code: 'unknown', poolAtStart: { total: 1, idle: 0, waiting: 0 } });
        expect(pool.waitingCount).toBe(0);
        expect(pool.totalCount).toBe(1);
    } finally {
        client.release();
    }
    expect(pool.idleCount).toBe(1);
    client.emit('error', failure);
    expect(log.mock.calls[1][1].event).toBe('database_idle_connection_error');
    expect(pool.totalCount).toBe(0);
    await pool.end();
});

it('preserves ended-pool synchronous callback return and promise rejection when logging throws', async () => {
    const pool = new Pool();
    installDatabaseDiagnostics(pool);
    await pool.end();
    log.mockImplementation(() => { throw new Error('logger failed'); });
    const callback = jest.fn((error: Error | undefined) => {
        expect(error?.message).toBe('Cannot use a pool after calling end on the pool');
        return 'sentinel';
    });
    // pg returns the callback value in this synchronous error path even though
    // its public TypeScript overload declares void.
    expect(pool.connect(callback)).toBe('sentinel');
    expect(callback).toHaveBeenCalledTimes(1);
    await expect(pool.connect()).rejects.toThrow('Cannot use a pool after calling end on the pool');
    expect(log).toHaveBeenCalledTimes(2);
});
