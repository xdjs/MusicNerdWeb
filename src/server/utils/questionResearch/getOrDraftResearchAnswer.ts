import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db/drizzle";
import type { ResearchReference } from "@/lib/questionResearch/schemas";
import { draftResearchAnswer } from "./draftResearchAnswer";

const source = z.object({
  n: z.number().int().min(1).max(3),
  title: z.string().max(500),
  url: z.string().url(),
  sourceId: z.string(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  curation: z.enum(["approved", "pending"]),
  evidenceKind: z.enum(["original_text", "caption", "provider_transcript"]),
});
const saved = z.object({
  answer: z.string().min(1).max(4000),
  sources: z.array(source).max(3),
  instagramMentions: z.array(z.string().max(100)).max(30),
  fromOpenWeb: z.boolean(),
  webDomains: z.array(z.string()).max(3),
  suggestions: z.array(z.string()).max(4),
  basis: z.array(z.object({
    sourceId: z.string(),
    revision: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    url: z.string().url(),
    textHash: z.string().regex(/^[a-f0-9]{64}$/),
    publishedAt: z.string().nullable(),
    activityDate: z.string().optional(),
    activityDateKind: z.enum(["release", "moment"]).optional(),
  })).max(3),
});
type Row = {
  artist_id: string;
  status: string;
  claim_until: string;
  attempts: number;
  result: unknown;
  failure_stage: string | null;
};
type Outcome =
  | { state: "ready"; result: Omit<z.infer<typeof saved>, "basis"> }
  | { state: "drafting" }
  | { state: "failed"; stage: string; retryable: boolean }
  | { state: "unregistered" }
  | { state: "unavailable" };
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const allowedStages = new Set([
  "read_original", "fetch_original", "validate_original", "draft",
  "quote_check", "claim_check", "store_result",
]);

/** One checked answer per exact job/question, with a bounded cross-instance drafting lease. */
export async function getOrDraftResearchAnswer(input: {
  artistId: string;
  artistName: string;
  jobId: string;
  question: string;
  references: ResearchReference[];
  signal?: AbortSignal;
}): Promise<Outcome> {
  const { artistId, artistName, jobId, question, references, signal } = input;
  const questionHash = hash(question);
  const token = randomUUID();
  // Opportunistic physical cleanup; the expiry index keeps this bounded. Job
  // and artist deletion also cascade, including when no visitor returns.
  await db.execute(sql`delete from artist_question_answers where expires_at < now()`);
  let ownsLease = false;
  {
    const [row] = await db.execute<Row>(sql`
      select artist_id,status,claim_until,attempts,result,failure_stage
      from artist_question_answers
      where job_id=${jobId}::uuid and artist_id=${artistId}::uuid
        and question_hash=${questionHash} and expires_at>now()`);
    if (!row) return { state: "unregistered" };
    if (row.status === "verified") {
      const parsed = saved.safeParse(row.result);
      if (!parsed.success) return { state: "unavailable" };
      // The API status already rechecked these exact slices against current
      // public originals and removed revoked/wrong-artist sources.
      const current = parsed.data.basis.map(b => references.find(r =>
        r.sourceId === b.sourceId && r.revision === b.revision &&
        r.start === b.start && r.end === b.end && r.url === b.url &&
        hash(r.text) === b.textHash && r.publishedAt === b.publishedAt &&
        r.activityDate === b.activityDate && r.activityDateKind === b.activityDateKind));
      if (current.some(r => !r) || current.length !== parsed.data.sources.length)
        return { state: "unavailable" };
      const result = {
        answer: parsed.data.answer,
        sources: parsed.data.sources,
        instagramMentions: parsed.data.instagramMentions,
        fromOpenWeb: parsed.data.fromOpenWeb,
        webDomains: parsed.data.webDomains,
        suggestions: parsed.data.suggestions,
      };
      return {
        state: "ready",
        result: {
          ...result,
          sources: result.sources.map((s, i) => ({
            ...s,
            curation: current[i]!.curation,
          })),
          fromOpenWeb: current.some(r => r!.curation === "pending"),
        },
      };
    }
    if (row.attempts >= 3 && row.status === "failed")
      return { state: "failed", stage: row.failure_stage ?? "draft", retryable: false };
    if (row.status !== "waiting" && Date.parse(row.claim_until) > Date.now())
      return row.status === "failed"
        ? { state: "failed", stage: row.failure_stage ?? "draft", retryable: true }
        : { state: "drafting" };
    const claimed = await db.execute<{ claim_token: string }>(sql`
      update artist_question_answers
      set status='drafting',claim_token=${token}::uuid,
        claim_until=now()+interval '70 seconds',attempts=attempts+1,
        failure_stage=null,updated_at=now()
      where job_id=${jobId}::uuid and artist_id=${artistId}::uuid
        and question_hash=${questionHash}
        and (status='waiting' or (status in ('drafting','failed') and claim_until<now()))
        and attempts<3 and expires_at>now()
      returning claim_token`);
    ownsLease = claimed.length === 1;
  }
  if (!ownsLease) return { state: "drafting" };
  try {
    const drafted = await draftResearchAnswer(
      artistId, artistName, question, references, signal,
    );
    const used = drafted.sources.map(s => references[s.n - 1]);
    if (used.some((r, i) => !r || r.sourceId !== drafted.sources[i].sourceId ||
      r.revision !== drafted.sources[i].revision))
      throw Object.assign(new Error("Cited reference unavailable"), { verificationStage: "store_result" });
    const result = saved.parse({
      ...drafted,
      basis: used.map(r => ({
        sourceId: r.sourceId, revision: r.revision, start: r.start,
        end: r.end, url: r.url, textHash: hash(r.text), publishedAt: r.publishedAt,
        activityDate: r.activityDate, activityDateKind: r.activityDateKind,
      })),
    });
    if (result.sources.length !== result.basis.length)
      throw Object.assign(new Error("Cited reference unavailable"), { verificationStage: "store_result" });
    const committed = await db.execute<{ job_id: string }>(sql`
      update artist_question_answers
      set status='verified',result=${JSON.stringify(result)}::text::jsonb,
        failure_stage=null,updated_at=now()
      where job_id=${jobId}::uuid and artist_id=${artistId}::uuid
        and question_hash=${questionHash} and claim_token=${token}::uuid
        and status='drafting' and claim_until>now() and expires_at>now()
      returning job_id`);
    if (!committed.length) return { state: "drafting" };
    const publicResult = {
      answer: result.answer, sources: result.sources,
      instagramMentions: result.instagramMentions,
      fromOpenWeb: result.fromOpenWeb,
      webDomains: result.webDomains, suggestions: result.suggestions,
    };
    return { state: "ready", result: publicResult };
  } catch (error) {
    const raw = error && typeof error === "object" && "verificationStage" in error
      ? error.verificationStage : null;
    const stage = typeof raw === "string" && allowedStages.has(raw) ? raw : "store_result";
    await db.execute(sql`
      update artist_question_answers
      set status='failed',result=null,failure_stage=${stage},
        claim_until=now()+interval '30 seconds',updated_at=now()
      where job_id=${jobId}::uuid and artist_id=${artistId}::uuid
        and question_hash=${questionHash} and claim_token=${token}::uuid
        and status='drafting'`);
    return { state: "failed", stage, retryable: true };
  }
}
