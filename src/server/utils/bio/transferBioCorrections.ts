import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';

/** Called inside account merge, after account locks and before placeholder deletion. */
export async function transferBioCorrections(tx: Pick<typeof db, 'execute'>, fromUserId: string, toUserId: string) {
  await tx.execute(sql`update artist_bio_corrections set
    user_id=case when user_id=${fromUserId}::uuid then ${toUserId}::uuid else user_id end,
    reviewed_by=case when reviewed_by=${fromUserId}::uuid then ${toUserId}::uuid else reviewed_by end
    where user_id=${fromUserId}::uuid or reviewed_by=${fromUserId}::uuid`);
}
