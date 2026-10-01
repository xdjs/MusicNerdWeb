import { sql } from "drizzle-orm";
import { withResearchJobWrite } from "../queries/ownershipWrites";
import type { ResearchJob } from "../queries/researchJobQueries";
import type { LatestRefreshState } from "@/lib/latest/types";

/** Strict write: provider-start intent must never be swallowed on a database failure. */
export async function latestRefreshStore(
  job: ResearchJob,
  state: LatestRefreshState,
  done?: boolean,
  resetAttempts = false,
) {
  return withResearchJobWrite(job.artistId, job.id, async (tx) => {
    const rows =
      await tx.execute(sql`update artist_research_jobs set state=${JSON.stringify(state)}::jsonb,
 status=${done === undefined ? "running" : done ? "done" : "pending"},
 attempts=${resetAttempts ? 0 : sql`attempts`},
 claimed_at=${done === undefined ? sql`now()` : sql`null`}, updated_at=now()
 where id=${job.id}::uuid and kind='latest_refresh' and status='running' returning id`);
    if (!rows.length) throw new Error("Latest refresh no longer active");
  });
}
