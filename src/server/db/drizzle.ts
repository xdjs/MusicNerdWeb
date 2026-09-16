import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema'
import { SUPABASE_DB_CONNECTION } from '@/env';

const connectionString = SUPABASE_DB_CONNECTION

// Reuse the client across hot reloads in development to prevent connection pool exhaustion
const globalForDb = globalThis as unknown as { pgClient: ReturnType<typeof postgres> | undefined };

const client = globalForDb.pgClient ?? postgres(connectionString, {
    prepare: false,
    // Each warm server instance shares the finite staging/production pool.
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
    globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
