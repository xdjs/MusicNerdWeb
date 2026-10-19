import { MAX_RESEARCH_REFERENCES } from "@/lib/questionResearch/limits";
import { referenceSchema } from "@/lib/questionResearch/schemas";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/drizzle";
import { evidenceFacetsSchema } from "@/lib/questionResearch/schemas";
import type { QuestionReuseCandidate } from "@/lib/questionResearch/reuseTypes";
const rowSchema = z.object({
  job_id: z.string().uuid(),
  question_hash: z.string().regex(/^[a-f0-9]{64}$/),
  answer_intent: z.string().trim().min(1).max(500),
  routing: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string()), evidenceFacetsSchema, z.null()]),
  ),
  answer: z.string().min(1).max(4000),
  refs: z.array(referenceSchema).max(MAX_RESEARCH_REFERENCES),
  sources: z.array(z.unknown()).min(1).max(MAX_RESEARCH_REFERENCES),
  basis: z
    .array(
      z.object({
        sourceId: z.string(),
        revision: z.string(),
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
        url: z.string().url(),
        textHash: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1)
    .max(MAX_RESEARCH_REFERENCES),
});
/** Bounded eligible public candidates, not raw conversations or private artist memory. */
export async function listReusableQuestionCandidates(
  artistId: string,
): Promise<QuestionReuseCandidate[]> {
  const rows = await db.execute(sql`
    select * from (select distinct on (r.job_id,r.question_hash) r.job_id,r.question_hash,r.answer_intent,r.routing,a.result->>'answer' as answer,a.result->'sources' as sources,a.result->'basis' as basis,j.state->'references' as refs,r.expires_at
    from artist_question_requests r
    join artist_question_answers a on a.artist_id=r.artist_id and a.job_id=r.job_id and a.question_hash=r.question_hash
    join artist_research_jobs j on j.id=r.job_id and j.artist_id=r.artist_id and j.kind='question_research'
    where r.artist_id=${artistId}::uuid and r.reusable and r.expires_at>now()
      and r.answer_intent is not null and a.status='verified' and a.expires_at>now() and j.status='done'
    order by r.job_id,r.question_hash,r.expires_at desc) candidates
    order by expires_at desc limit 5`);
  // Keep the former five-candidate × six-reference × 1,000-character ceiling,
  // but spend it on intact cited windows instead of clipping the support away.
  let remaining = 5 * MAX_RESEARCH_REFERENCES * 1000;
  return rows.flatMap((row) => {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) return [];
    const r = parsed.data;
    if (r.basis.length !== r.sources.length) return [];
    const cited = r.basis.map((b) =>
      r.refs.find(
        (ref) =>
          ref.sourceId === b.sourceId &&
          ref.revision === b.revision &&
          ref.start === b.start &&
          ref.end === b.end &&
          ref.url === b.url &&
          createHash("sha256").update(ref.text).digest("hex") === b.textHash,
      ),
    );
    if (cited.some((ref) => !ref)) return [];
    const passages = cited.flatMap((ref) =>
      ref
        ? [{ text: ref.text, url: ref.url, evidenceKind: ref.evidenceKind }]
        : [],
    );
    const size = passages.reduce((total, p) => total + p.text.length, 0);
    if (size > remaining) return [];
    remaining -= size;
    const { reuseFallbackJobId: _handoff, ...routing } = r.routing;
    return [
      {
        id: `${r.job_id}:${r.question_hash}`,
        jobId: r.job_id,
        questionHash: r.question_hash,
        intent: r.answer_intent,
        routing,
        answer: r.answer,
        passages,
      },
    ];
  });
}
