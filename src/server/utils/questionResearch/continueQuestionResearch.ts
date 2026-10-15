import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/drizzle";
import { getResearchQuestionHash } from "@/lib/questionResearch/getResearchQuestionHash";
import { questionPlanSchema, researchStatusSchema } from "@/lib/questionResearch/schemas";
import { callResearchApi } from "./callResearchApi";
import { registerResearchQuestion } from "./registerResearchQuestion";
import { bindQuestionRequest } from "./bindQuestionRequest";

/** A semantic miss continues its already-admitted server plan, never client routing or a new planner. */
export async function continueQuestionResearch(input: {
  artistId: string;
  jobId: string;
  question: string;
  signal?: AbortSignal;
}) {
  const token = randomUUID();
  const [binding] = await db.execute<{
    request_hash: string;
    routing: Record<string, unknown>;
    answer_intent: string | null;
  }>(sql`
    with selected as (
      select artist_id,request_hash from artist_question_requests
      where artist_id=${input.artistId}::uuid and job_id=${input.jobId}::uuid
        and question_hash=${getResearchQuestionHash(input.question)}
        and routing->>'reuseFallbackJobId'=${input.jobId}
        and lease_until<=now() and expires_at>now()
      order by expires_at desc limit 1 for update skip locked
    )
    update artist_question_requests r set token=${token}::uuid,lease_until=now()+interval '90 seconds'
    from selected s where r.artist_id=s.artist_id and r.request_hash=s.request_hash
    returning r.request_hash,r.routing,r.answer_intent`);
  if (!binding) {
    const [active] = await db.execute<{ job_id: string; busy: boolean }>(sql`
      select job_id,lease_until>now() as busy from artist_question_requests
      where artist_id=${input.artistId}::uuid and question_hash=${getResearchQuestionHash(input.question)}
        and routing->>'reuseFallbackJobId'=${input.jobId} and expires_at>now()
      order by expires_at desc limit 1`);
    if (active?.job_id !== undefined && active.job_id !== input.jobId)
      return researchStatusSchema.parse(await callResearchApi(
        `/api/artist/${input.artistId}/research/questions/${active.job_id}`, { signal: input.signal },
      ));
    return active?.busy ? { pending: true as const } : null;
  }
  try {
    const { reuseFallbackJobId: _handoff, ...savedRouting } = binding.routing;
    const parsed = questionPlanSchema.omit({ resolvedQuestion: true }).extend({
      excludeSourceUrls: z.array(z.string().url().max(2000)).max(10).optional(),
    }).parse({ targetUrl: null, platform: null, fromDate: null, toDate: null, ...savedRouting });
    const routing = Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== null));
    const state = researchStatusSchema.parse(await callResearchApi(
      `/api/artist/${input.artistId}/research/questions`, { body: routing, signal: input.signal },
    ));
    if (state.jobId !== input.jobId && !await registerResearchQuestion(input.artistId, state.jobId, input.question))
      throw Object.assign(new Error("The saved research answer limit was reached"), { status: 429 });
    await bindQuestionRequest({
      artistId: input.artistId, requestHash: binding.request_hash, token,
      jobId: state.jobId, question: input.question, reusable: state.jobId !== input.jobId,
      answerIntent: binding.answer_intent ?? undefined,
      routing: state.jobId === input.jobId ? routing : { ...routing, reuseFallbackJobId: input.jobId },
    });
    // Idempotent queueing may return this same bounded job; never loop or invent a new plan.
    return state.jobId === input.jobId ? null : state;
  } finally {
    await db.execute(sql`update artist_question_requests set lease_until=now()
      where artist_id=${input.artistId}::uuid and request_hash=${binding.request_hash} and token=${token}::uuid`);
  }
}
