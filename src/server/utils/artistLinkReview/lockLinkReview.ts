import { sql } from 'drizzle-orm';
import type { db } from '@/server/db/drizzle';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';
/** Same artist lock used by claim changes; role and claim stay locked through the write. */
export async function lockLinkReview(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], artistId: string, userId: string) {
  const [artist] = await tx.execute(sql`select id from artists where id=${artistId}::uuid for update`);
  const [user] = await tx.execute(sql`select is_admin from users where id=${userId}::uuid for share`);
  const [claim] = await tx.execute(sql`select user_id from artist_claims where artist_id=${artistId}::uuid and status='approved' for share`);
  if (!artist || !user || (!user.is_admin && claim?.user_id !== userId)) throw new OwnershipChangedError();
}
