import type { Pool, PoolClient } from 'pg';
import { buildDatabaseFailureDiagnostic } from './buildDatabaseFailureDiagnostic';

// Install only when creating the process-local pool. No query interception,
// retry, timeout/config change, or ownership of checked-out clients.
export function installDatabaseDiagnostics(pool: Pool) {
    type Callback = Parameters<Pool['connect']>[0];
    const connect = pool.connect;
    const now = () => { try { return performance.now(); } catch { return NaN; } };
    const milliseconds = (value: number) => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? Math.floor(value) : null;
    const poolCreatedAt = now();
    const snapshot = () => {
        try { return buildDatabaseFailureDiagnostic(null, pool).pool; } catch { return null; }
    };
    const report = (error: unknown, event: 'database_idle_connection_error' | 'database_acquisition_error', poolAtStart?: ReturnType<typeof snapshot>, startedAt?: number) => {
        try {
            const failedAt = now();
            console.error('[database] Connection failure', {
                ...buildDatabaseFailureDiagnostic(error, pool, event),
                poolAgeMs: milliseconds(failedAt - poolCreatedAt),
                processAgeMs: milliseconds(process.uptime() * 1000),
                ...(poolAtStart !== undefined ? { poolAtStart, acquisitionElapsedMs: milliseconds(failedAt - (startedAt ?? NaN)) } : {}),
            });
        } catch {
            // Diagnostics must never replace the driver's error or prevent cleanup.
        }
    };
    pool.on('error', error => report(error, 'database_idle_connection_error'));
    pool.connect = function (callback?: Callback) {
        const poolAtStart = snapshot();
        const startedAt = now();
        if (callback) {
            return connect.call(pool, (error, client, release) => {
                if (error) report(error, 'database_acquisition_error', poolAtStart, startedAt);
                return callback(error, client, release);
            });
        }
        // TypeScript selects the final callback overload for call(); restore the
        // no-argument signature without changing the driver's Promise implementation.
        const promise = (connect as () => Promise<PoolClient>).call(pool);
        return promise.catch((error: unknown) => {
            report(error, 'database_acquisition_error', poolAtStart, startedAt);
            throw error;
        });
    } as Pool['connect'];
}
