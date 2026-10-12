import { sql } from 'drizzle-orm';
import { db } from '@/server/db/drizzle';
import { getResearchQuestionHash } from '@/lib/questionResearch/getResearchQuestionHash';
/** Persist digests only; a late worker cannot overwrite the next lease owner. */
export async function bindQuestionRequest(input: { artistId: string; requestHash: string; token: string; jobId: string; question: string; reusable: boolean; questionHash?: string; answerIntent?: string; routing?: Record<string, string | string[] | null> }): Promise<void> {
  const rows = await db.execute(sql`
    update artist_question_requests set job_id=${input.jobId}::uuid,
      question_hash=${input.questionHash ?? getResearchQuestionHash(input.question)},reusable=${input.reusable},lease_until=now(),
      answer_intent=${input.answerIntent ?? null},routing=${JSON.stringify(input.routing ?? {})}::jsonb
    where artist_id=${input.artistId}::uuid and request_hash=${input.requestHash}
      and token=${input.token}::uuid and lease_until>now() and expires_at>now()
    returning token`);
  if (!rows.length) throw new Error('Request binding lease expired');
}
