import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { createDatabase } from './createDatabase';
import { SUPABASE_DB_CONNECTION } from '@/env';

const connectionString = SUPABASE_DB_CONNECTION

// Reuse the client across hot reloads in development to prevent connection pool exhaustion
const globalForDb = globalThis as unknown as { musicNerdPgPool: Pool | undefined };

const client = globalForDb.musicNerdPgPool ?? new Pool({
    connectionString,
    // Shared transaction pooling cannot safely multiplex pipelined queries.
    // node-postgres serializes each connection; Drizzle uses unnamed statements.
    pipeline: false,
    // Each warm server instance shares the finite staging/production pool.
    max: 3,
    idleTimeoutMillis: process.env.VERCEL_ENV === 'preview' ? 5_000 : 20_000,
    connectionTimeoutMillis: 10_000,
});

// Idle connection failures are emitted outside a query promise. The pool removes
// that connection; handle the event without logging credentials or query data.
if (!globalForDb.musicNerdPgPool) {
    // Keep preview instances awake through idle cleanup; never close active clients.
    // Register once per pool, including when development hot reload reuses it.
    if (process.env.VERCEL_ENV === 'preview') attachDatabasePool(client);
    client.on('error', () => console.error('[database] Idle connection closed unexpectedly'));
}

if (process.env.NODE_ENV !== 'production') {
    globalForDb.musicNerdPgPool = client;
}

export const db = createDatabase(client);
