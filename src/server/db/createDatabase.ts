import { drizzle } from 'drizzle-orm/node-postgres';
import type { PgTransactionConfig } from 'drizzle-orm/pg-core';
import type { SQLWrapper } from 'drizzle-orm';
import type { Pool, PoolClient } from 'pg';
import * as schema from './schema';

function nativeDatabase(pool: Pool | PoolClient) {
    return drizzle(pool, { schema });
}

type NativeDatabase = ReturnType<typeof nativeDatabase>;
type NativeTransaction = Parameters<Parameters<NativeDatabase['transaction']>[0]>[0];
type RowDatabase<T> = Omit<T, 'execute' | 'transaction'> & {
    execute<TRow extends Record<string, unknown> = Record<string, unknown>>(query: SQLWrapper | string): Promise<TRow[]>;
    transaction<TValue>(callback: (tx: RowDatabase<NativeTransaction>) => Promise<TValue>, config?: PgTransactionConfig): Promise<TValue>;
};

// Raw SQL callers predate this driver and expect row arrays, including inside
// transactions. Keep that contract while leaving Drizzle's query builders and
// transaction client reservation intact. Bind other methods to the native DB so
// its internal calls continue to receive node-postgres QueryResult objects.
function withRowResults<T extends NativeDatabase | NativeTransaction>(database: T, pool?: Pool): RowDatabase<T> {
    return new Proxy(database, {
        get(target, property) {
            if (property === 'execute') {
                return async (query: SQLWrapper | string) => (await target.execute(query)).rows;
            }
            if (property === 'transaction') {
                return async <TValue>(callback: (tx: RowDatabase<NativeTransaction>) => Promise<TValue>, config?: PgTransactionConfig) => {
                    if (!pool) return target.transaction(tx => callback(withRowResults(tx)), config);
                    // Drizzle 0.44 starts BEGIN before its pool-release finally.
                    // Own the checkout so even a failed BEGIN releases capacity.
                    const client = await pool.connect();
                    let failure: Error | undefined;
                    try {
                        return await withRowResults(nativeDatabase(client)).transaction(callback, config);
                    } catch (error) {
                        failure = error instanceof Error ? error : new Error('Database transaction failed');
                        throw error;
                    } finally {
                        client.release(failure);
                    }
                };
            }
            const value = Reflect.get(target, property, target);
            return typeof value === 'function' ? value.bind(target) : value;
        },
    }) as unknown as RowDatabase<T>;
}

export function createDatabase(pool: Pool) {
    return withRowResults(drizzle(pool, { schema }), pool);
}
