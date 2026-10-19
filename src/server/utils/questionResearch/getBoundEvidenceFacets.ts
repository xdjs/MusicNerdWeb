import { evidenceFacetsSchema } from "@/lib/questionResearch/schemas";
import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

export type BoundEvidenceFacets =
  | { state: "ready"; facets: { id: string; intent: string }[] }
  | { state: "legacy" }
  | { state: "invalid" };

/** Load only the planner facets bound to this exact artist/job/question answer. */
export async function getBoundEvidenceFacets(input: {
  artistId: string;
  jobId: string;
  questionHashes: string[];
}): Promise<BoundEvidenceFacets> {
  const hashes = [...new Set(input.questionHashes.filter(hash => /^[a-f0-9]{64}$/.test(hash)))];
  if (!hashes.length) return { state: "invalid" };
  const [row] = await db.execute<{ routing: unknown }>(sql`
    select routing from artist_question_requests
    where artist_id=${input.artistId}::uuid and job_id=${input.jobId}::uuid
      and question_hash in (${sql.join(hashes.map(hash => sql`${hash}`), sql`, `)})
      and expires_at>now()
    order by expires_at desc limit 1`);
  if (!row || !row.routing || typeof row.routing !== "object" || Array.isArray(row.routing))
    return { state: "legacy" };
  const value = (row.routing as Record<string, unknown>).evidenceFacets;
  if (value === undefined) return { state: "legacy" };
  const parsed = evidenceFacetsSchema.safeParse(value);
  return parsed.success ? { state: "ready", facets: parsed.data } : { state: "invalid" };
}
