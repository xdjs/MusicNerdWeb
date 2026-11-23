type PoolCounts = { totalCount: number; idleCount: number; waitingCount: number };

const CONNECTION_CODES = new Set([
    'EAUTHTIMEOUT', '08006', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT',
    'EMAXCONNSESSION', '53300', '57P01',
]);

// Never serialize the error itself: driver messages may include connection or
// query data. These counts describe this process only, not Supabase capacity.
export function buildDatabaseFailureDiagnostic(error: unknown, pool: PoolCounts, event: 'database_idle_connection_error' | 'database_acquisition_error' = 'database_idle_connection_error') {
    let code = 'unknown';
    try {
        const candidate = typeof error === 'object' && error !== null && 'code' in error
            ? error.code : undefined;
        if (typeof candidate === 'string' && CONNECTION_CODES.has(candidate)) code = candidate;
    } catch {
        // A malformed error must not break the existing idle-error handler.
    }
    // Exact driver messages only: never return arbitrary text or inspect causes.
    let category = code === 'unknown' ? 'unknown' : 'coded_connection_error';
    if (code === 'unknown') {
        try {
            const message = error instanceof Error ? error.message : undefined;
            if (message === 'timeout exceeded when trying to connect') category = 'pool_wait_timeout';
            if (message === 'Connection terminated due to connection timeout') category = 'connection_timeout';
            if (message === 'Cannot use a pool after calling end on the pool') category = 'pool_ended';
        } catch { /* A throwing message getter must not alter driver behavior. */ }
    }
    const count = (value: number) => Number.isSafeInteger(value) && value >= 0 ? value : null;
    return {
        event,
        code,
        category,
        pool: {
            total: count(pool.totalCount),
            idle: count(pool.idleCount),
            waiting: count(pool.waitingCount),
        },
    };
}
