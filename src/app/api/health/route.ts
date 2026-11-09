import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { SUPABASE_DB_CONNECTION } from '@/env';
import { db } from '@/server/db/drizzle';

export const dynamic = 'force-dynamic';

// Keep this candidate-local probe until #1627/#1628 remove all Web database
// consumers. External API health cannot validate this deployment's credentials.
export async function GET() {
    let database = false;
    if (SUPABASE_DB_CONNECTION.trim()) {
        try {
            await db.execute(sql`select 1`);
            database = true;
        } catch {
            // Provider errors can contain credentials. Expose only health state.
        }
    }

    return NextResponse.json(
        { ok: database, checks: { database } },
        { status: database ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
}
