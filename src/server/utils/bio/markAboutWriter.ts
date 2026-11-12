import { sql } from 'drizzle-orm';
import type { ScopedWriteDb } from '@/server/utils/queries/ownershipWrites';

/** Opt a compatible transaction into About writes; not a substitute for authorization. */
export async function markAboutWriter(tx: Pick<ScopedWriteDb, 'execute'>) {
    await tx.execute(sql`select set_config('musicnerd.about_writer_version', '1655-v1', true)`);
}
