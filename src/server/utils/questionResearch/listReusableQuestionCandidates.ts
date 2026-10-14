import { MAX_RESEARCH_REFERENCES } from "@/lib/questionResearch/limits";
import { referenceSchema } from "@/lib/questionResearch/schemas";
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db/drizzle';
import type { QuestionReuseCandidate } from '@/lib/questionResearch/reuseTypes';
const rowSchema = z.object({
  job_id:z.string().uuid(), question_hash:z.string().regex(/^[a-f0-9]{64}$/),
  answer_intent:z.string().trim().min(1).max(500),
  routing:z.record(z.string(),z.union([z.string(),z.array(z.string()),z.null()])),
  answer:z.string().min(1).max(4000),
  refs:z.array(referenceSchema).max(MAX_RESEARCH_REFERENCES),
  sources:z.array(z.unknown()).min(1).max(MAX_RESEARCH_REFERENCES),
});
/** Bounded eligible public candidates, not raw conversations or private artist memory. */
export async function listReusableQuestionCandidates(artistId:string):Promise<QuestionReuseCandidate[]> {
  const rows=await db.execute(sql`
    select * from (select distinct on (r.job_id,r.question_hash) r.job_id,r.question_hash,r.answer_intent,r.routing,a.result->>'answer' as answer,a.result->'sources' as sources,j.state->'references' as refs,r.expires_at
    from artist_question_requests r
    join artist_question_answers a on a.artist_id=r.artist_id and a.job_id=r.job_id and a.question_hash=r.question_hash
    join artist_research_jobs j on j.id=r.job_id and j.artist_id=r.artist_id and j.kind='question_research'
    where r.artist_id=${artistId}::uuid and r.reusable and r.expires_at>now()
      and r.answer_intent is not null and a.status='verified' and a.expires_at>now() and j.status='done'
    order by r.job_id,r.question_hash,r.expires_at desc) candidates
    order by expires_at desc limit 5`);
  return rows.flatMap(row=>{
    const parsed=rowSchema.safeParse(row);
    if(!parsed.success)return [];
    const r=parsed.data;
    return [{id:`${r.job_id}:${r.question_hash}`,jobId:r.job_id,questionHash:r.question_hash,intent:r.answer_intent,routing:r.routing,answer:r.answer,passages:r.refs.map(ref=>({text:ref.text.slice(0,1000),url:ref.url,evidenceKind:ref.evidenceKind}))}];
  });
}
