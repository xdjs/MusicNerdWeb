import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

// Fixed keys, independent of artist IDs, share the budget across app instances.
// The two-int advisory-lock space is separate from the bigint ownership locks.
const PROVIDER_KEYS = { deezer: 1296974592, spotify: 1296974593 };
const SLOTS = 2;
const MIN_SLOT_MS = 2000;
const REQUEST_TIMEOUT_MS = 5000;

/** Only call on a catalog cache miss. Transaction-scoped, nonblocking locks work
 * with the transaction pooler and release on commit/rollback/disconnection. No
 * artist rows are locked or written. Two slots held for at least two seconds
 * bound each provider to a burst of two and at most one new request/second on
 * average; slow calls also retain their slot until the five-second deadline. */
export async function withCatalogBudget<T>(
    platform: keyof typeof PROVIDER_KEYS,
    operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
    return db.transaction(async (tx) => {
        let admitted = false;
        for (let slot = 0; slot < SLOTS; slot++) {
            const rows = await tx.execute<{ acquired: boolean }>(
                sql`SELECT pg_try_advisory_xact_lock(${PROVIDER_KEYS[platform]}::int, ${slot}::int) AS acquired`,
            );
            if (rows[0]?.acquired === true) {
                admitted = true;
                break;
            }
        }
        if (!admitted) throw new Error('Release catalog capacity unavailable');

        const started = performance.now();
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                operation(controller.signal),
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => {
                        controller.abort();
                        reject(new Error('Release catalog request timed out'));
                    }, REQUEST_TIMEOUT_MS);
                }),
            ]);
        } finally {
            clearTimeout(timer);
            // Failed/fast responses consume the same budget as successful ones.
            const remaining = MIN_SLOT_MS - (performance.now() - started);
            if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
        }
    });
}
