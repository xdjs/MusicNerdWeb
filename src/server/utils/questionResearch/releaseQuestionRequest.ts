import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
/** Release only this unfinished lease; never erase a binding or refund planning budget. */
export async function releaseQuestionRequest(artistId: string, requestHash: string, token: string): Promise<void> {
  await db.execute(sql`delete from artist_question_requests
    where artist_id=${artistId}::uuid and request_hash=${requestHash}
      and token=${token}::uuid and job_id is null`);
}
