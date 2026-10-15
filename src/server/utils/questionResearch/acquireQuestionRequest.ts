import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';

type Binding = { token: string; job_id: string | null; question_hash: string | null; reusable: boolean; busy: boolean };
/** Short transaction only: no model or network work while holding the request lock. */
export async function acquireQuestionRequest(artistId: string, requestHash: string, invalidateToken?: string): Promise<
  | { state: 'claimed'; token: string }
  | { state: 'bound'; binding: Binding }
  | { state: 'busy' }
> {
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('musicnerd-question-request-index'))`);
    await tx.execute(sql`delete from artist_question_requests where expires_at<now() or (job_id is null and lease_until<now())`);
    const [row] = await tx.execute<Binding>(sql`
      select token,job_id,question_hash,reusable,lease_until>now() as busy
      from artist_question_requests where artist_id=${artistId}::uuid and request_hash=${requestHash}`);
    if (row?.busy) return { state: 'busy' };
    if (row?.job_id && (!invalidateToken || row.token !== invalidateToken))
      return { state: 'bound', binding: row };
    const token = randomUUID();
    await tx.execute(sql`
      insert into artist_question_requests(artist_id,request_hash,token,lease_until,expires_at)
      values(${artistId}::uuid,${requestHash},${token}::uuid,now()+interval '90 seconds',now()+interval '24 hours')
      on conflict(artist_id,request_hash) do update set
        token=excluded.token,lease_until=excluded.lease_until,expires_at=excluded.expires_at,
        job_id=null,question_hash=null,reusable=false`);
    return { state: 'claimed', token };
  });
}
