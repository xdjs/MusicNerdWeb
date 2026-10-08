import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/** Bind an exact question to a job before acknowledgement, with a hard model-draft budget. */
export async function registerResearchQuestion(
  artistId: string,
  jobId: string,
  question: string,
): Promise<boolean> {
  const questionHash = createHash("sha256").update(question).digest("hex");
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${jobId}))`);
    await tx.execute(sql`delete from artist_question_answers where expires_at<now()`);
    const [known] = await tx.execute(sql`
      select 1 from artist_question_answers
      where job_id=${jobId}::uuid and artist_id=${artistId}::uuid
        and question_hash=${questionHash} and expires_at>now()`);
    if (known) return true;
    const [usage] = await tx.execute<{ n: number }>(sql`
      select count(*)::int as n from artist_question_answers
      where job_id=${jobId}::uuid and expires_at>now()`);
    if (!usage || Number(usage.n) >= 3) return false;
    const inserted = await tx.execute<{ job_id: string }>(sql`
      insert into artist_question_answers
        (job_id,artist_id,question_hash,status,claim_token,claim_until,attempts,expires_at)
      select id,artist_id,${questionHash},'waiting',${randomUUID()}::uuid,
        now(),0,now()+interval '24 hours'
      from artist_research_jobs
      where id=${jobId}::uuid and artist_id=${artistId}::uuid and kind='question_research'
      on conflict (job_id,question_hash) do nothing
      returning job_id`);
    return inserted.length === 1;
  });
}
