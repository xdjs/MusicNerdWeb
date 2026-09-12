/** @jest-environment node */
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { withCatalogBudget } from '../catalogBudget';

jest.mock('@/server/db/drizzle', () => ({ db: { transaction: jest.fn() } }));

// Each callback represents a separate database transaction/application caller.
// The fake database owns the lock set, not the application module under test.
const held = new Set<string>();
const dialect = new PgDialect();
// jest.setup's eagerly loaded DB mock does not include transactions.
db.transaction = jest.fn();
const transaction = jest.mocked(db.transaction);

beforeEach(() => {
    jest.useFakeTimers();
    held.clear();
    transaction.mockReset();
    transaction.mockImplementation(async (callback) => {
        const owned: string[] = [];
        const tx = { execute: async (query: SQL) => {
            const { sql, params } = dialect.sqlToQuery(query);
            expect(sql).toContain('pg_try_advisory_xact_lock');
            const key = params.join(':');
            if (held.has(key)) return [{ acquired: false }];
            held.add(key);
            owned.push(key);
            return [{ acquired: true }];
        } };
        try {
            return await callback(tx as Parameters<Parameters<typeof db.transaction>[0]>[0]);
        } finally {
            owned.forEach(key => held.delete(key));
        }
    });
});
afterEach(() => jest.useRealTimers());

it('limits distinct callers globally and keeps providers independent', async () => {
    const operation = jest.fn(async () => 'catalog');
    const first = withCatalogBudget('spotify', operation);
    const second = withCatalogBudget('spotify', operation);
    await jest.advanceTimersByTimeAsync(0);
    await expect(withCatalogBudget('spotify', operation)).rejects.toThrow('capacity');
    const otherProvider = withCatalogBudget('deezer', operation);
    await jest.advanceTimersByTimeAsync(1999);
    expect(operation).toHaveBeenCalledTimes(3);
    await expect(withCatalogBudget('spotify', operation)).rejects.toThrow('capacity');
    await jest.advanceTimersByTimeAsync(1);
    expect(await Promise.all([first, second, otherProvider])).toEqual(['catalog', 'catalog', 'catalog']);
    expect(held.size).toBe(0);
    const next = withCatalogBudget('spotify', operation);
    await jest.advanceTimersByTimeAsync(2000);
    expect(await next).toBe('catalog');
});

it('charges failed calls the minimum interval and releases their transaction locks', async () => {
    const failed = expect(withCatalogBudget('deezer', async () => { throw new Error('provider down'); }))
        .rejects.toThrow('provider down');
    await jest.advanceTimersByTimeAsync(1999);
    expect(held.size).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    await failed;
    expect(held.size).toBe(0);
});

it('holds a slow call until its deadline, aborts it and releases capacity', async () => {
    let signal: AbortSignal | undefined;
    const pending = expect(withCatalogBudget('spotify', async (requestSignal) => {
        signal = requestSignal;
        return new Promise(() => {});
    })).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(4999);
    expect(held.size).toBe(1);
    expect(signal?.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await pending;
    expect(signal?.aborted).toBe(true);
    expect(held.size).toBe(0);
});

it('fails closed if the database cannot establish admission', async () => {
    transaction.mockRejectedValueOnce(new Error('database unavailable'));
    const operation = jest.fn();
    await expect(withCatalogBudget('spotify', operation)).rejects.toThrow('database unavailable');
    expect(operation).not.toHaveBeenCalled();
});
