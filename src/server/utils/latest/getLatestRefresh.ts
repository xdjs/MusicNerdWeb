import { latestRefreshScopeSql } from "./latestRefreshScopeSql";
import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import {
  LATEST_SOURCES,
  type LatestRefreshView,
  type SourceResult,
} from "@/lib/latest/types";
/** Private editor view; never serialize saved identities, actors, errors or provider IDs. */
export async function getLatestRefresh(
  artistId: string,
): Promise<LatestRefreshView | null> {
  const [row] =
    await db.execute(sql`select j.id,j.status,j.created_at,j.state from artist_research_jobs j join artists a on a.id=j.artist_id
  where j.artist_id=${artistId}::uuid and j.kind='latest_refresh' and (${latestRefreshScopeSql()}) order by j.created_at desc limit 1`);
  if (!row) return null;
  const state = row.state as { sources?: Record<string, SourceResult> };
  const terminal = row.status === "failed" || row.status === "done";
  const sources = Object.fromEntries(
    LATEST_SOURCES.map((s) => {
      const result = state.sources?.[s];
      return [
        s,
        {
          status:
            terminal && result?.status === "pending"
              ? "failed"
              : (result?.status ?? "failed"),
          ...(result?.checkedAt ? { checkedAt: result.checkedAt } : {}),
        },
      ];
    }),
  );
  const requestedAt = new Date(String(row.created_at)).toISOString();
  return {
    id: String(row.id),
    status: String(row.status),
    requestedAt,
    sources,
    retryAt: new Date(Date.parse(requestedAt) + 30 * 60000).toISOString(),
  } as LatestRefreshView;
}
