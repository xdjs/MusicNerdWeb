import type { Pool, PoolClient } from 'pg';
import { buildDatabaseFailureDiagnostic } from './buildDatabaseFailureDiagnostic';

// Install only when creating the process-local pool. No query interception,
// retry, timeout/config change, or ownership of checked-out clients.
export function installDatabaseDiagnostics(pool: Pool) {
    type Callback = Parameters<Pool['connect']>[0];
    const connect = pool.connect;
    const snapshot = () => {
        try { return buildDatabaseFailureDiagnostic(null, pool).pool; } catch { return null; }
    };
    const report = (error: unknown, event: 'database_idle_connection_error' | 'database_acquisition_error', poolAtStart?: ReturnType<typeof snapshot>) => {
        try {
            console.error('[database] Connection failure', { ...buildDatabaseFailureDiagnostic(error, pool, event), ...(poolAtStart !== undefined ? { poolAtStart } : {}) });
        } catch {
            // Diagnostics must never replace the driver's error or prevent cleanup.
        }
    };
    pool.on('error', error => report(error, 'database_idle_connection_error'));
    pool.connect = function (callback?: Callback) {
        const poolAtStart = snapshot();
        if (callback) {
            return connect.call(pool, (error, client, release) => {
                if (error) report(error, 'database_acquisition_error', poolAtStart);
                return callback(error, client, release);
            });
        }
        // TypeScript selects the final callback overload for call(); restore the
        // no-argument signature without changing the driver's Promise implementation.
        const promise = (connect as () => Promise<PoolClient>).call(pool);
        return promise.catch((error: unknown) => {
            report(error, 'database_acquisition_error', poolAtStart);
            throw error;
        });
    } as Pool['connect'];
}
