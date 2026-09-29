import { sql } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import type { ResearchJob } from "../queries/researchJobQueries";
import type { LatestRefreshState } from "@/lib/latest/types";

/** Strict write: provider-start intent must never be swallowed on a database failure. */
export async function latestRefreshStore(
  job: ResearchJob,
  state: LatestRefreshState,
  done?: boolean,
) {
  const rows =
    await db.execute(sql`update artist_research_jobs set state=${JSON.stringify(state)}::jsonb,
 status=${done === undefined ? "running" : done ? "done" : "pending"},
 claimed_at=${done === undefined ? sql`now()` : sql`null`}, updated_at=now()
 where id=${job.id}::uuid and kind='latest_refresh' and status='running' returning id`);
  if (!rows.length) throw new Error("Latest refresh no longer active");
}
