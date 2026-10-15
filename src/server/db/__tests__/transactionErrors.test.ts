/** @jest-environment node */
import { EventEmitter } from 'node:events';
import type { Pool, PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabase } from '../createDatabase';

jest.mock('drizzle-orm/node-postgres', () => ({ drizzle: jest.fn() }));

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

describe('checked-out transaction client errors', () => {
    beforeEach(() => jest.clearAllMocks());

    it.each(['BEGIN', 'transaction'])('handles an emitted client error during %s and releases once', async phase => {
        const client = Object.assign(new EventEmitter(), { release: jest.fn() });
        const pool = { connect: jest.fn().mockResolvedValue(client) };
        const entered = deferred<void>(), pending = deferred<void>();
        const callback = jest.fn(async () => {
            entered.resolve();
            await pending.promise;
            return 'complete';
        });
        const transaction: jest.Mock<Promise<string>, [(tx: object) => Promise<string>]> = jest.fn(async (run: (tx: object) => Promise<string>) => {
            if (phase === 'BEGIN') {
                entered.resolve();
                await pending.promise;
            }
            return run({ transaction });
        });
        (drizzle as unknown as jest.Mock).mockReturnValue({ transaction });
        const db = createDatabase(pool as unknown as Pool);
        // Attach the rejection observer before emitting, just like a request handler.
        const outcome = db.transaction(callback).then(value => ({ value }), error => ({ error }));
        const failure = new Error(`fixture ${phase} socket failure`);
        try {
            await entered.promise;
            // This is a real EventEmitter error event, not a rejected-query mock.
            // With no listener Node throws before the driver's query rejection.
            expect(() => client.emit('error', failure)).not.toThrow();
        } finally {
            pending.reject(failure);
            await outcome;
        }
        expect(await outcome).toEqual({ error: failure });
        expect(client.release).toHaveBeenCalledTimes(1);
        expect(client.release).toHaveBeenCalledWith(failure);
        expect(client.listenerCount('error')).toBe(0);
        if (phase === 'BEGIN') expect(callback).not.toHaveBeenCalled();
    });

    it('keeps unrelated listeners and removes its own listener after repeated successful checkouts', async () => {
        const unrelated = jest.fn();
        const client = Object.assign(new EventEmitter(), { release: jest.fn() });
        client.on('error', unrelated);
        const pool = { connect: jest.fn().mockResolvedValue(client) };
        (drizzle as unknown as jest.Mock).mockReturnValue({ transaction: (run: (tx: PoolClient) => Promise<string>) => run(client as unknown as PoolClient) });
        const db = createDatabase(pool as unknown as Pool);
        for (let i = 0; i < 3; i++) {
            await expect(db.transaction(async () => {
                expect(client.listenerCount('error')).toBe(2);
                return 'complete';
            })).resolves.toBe('complete');
            expect(client.listeners('error')).toEqual([unrelated]);
        }
        expect(client.release).toHaveBeenCalledTimes(3);
        expect(client.release).toHaveBeenLastCalledWith(undefined);
    });
});
