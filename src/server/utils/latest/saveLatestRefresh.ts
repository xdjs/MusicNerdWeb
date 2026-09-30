import { sql } from "drizzle-orm";
import { findLatestRefreshId } from "./findLatestRefreshId";
import { withScopedArtistWrite } from "../queries/ownershipWrites";
import { recordArtistActivity } from "../activity/recordArtistActivity";
import type { LatestRefreshState } from "@/lib/latest/types";

/**
 * Under the artist lock again, after the inline checks: queue the Instagram
 * check for MusicNerdAPI, or save the request as done when Instagram has
 * nothing to do.
 *
 * @param artistId - The artist.
 * @param state - The checked request.
 * @returns The job id: a simultaneous request's if it queued first, else the new one. Null when the artist's connections changed during the checks.
 */
export async function saveLatestRefresh(
  artistId: string,
  state: LatestRefreshState,
): Promise<string | null> {
  return withScopedArtistWrite(artistId, async (tx) => {
    // A simultaneous request may have queued first; it wins, and this one's checks still expired the caches.
    const existing = await findLatestRefreshId(tx, artistId);
    if (existing) return existing;
    const [artist] = await tx.execute(
      sql`select instagram,inprocess,spotify,deezer from artists where id=${artistId}::uuid`,
    );
    const unchanged = (["instagram", "inprocess", "spotify", "deezer"] as const).every(
      (source) => String(artist?.[source] ?? "") === (state[source] ?? ""),
    );
    if (!unchanged) return null;
    // Existing research already owns Instagram. Do not launch a competing paid check.
    // Checked under the same lock as the insert, so a scrape queued during the checks still counts.
    const busy =
      await tx.execute(sql`select id from artist_research_jobs where artist_id=${artistId}::uuid
   and kind='social_ingest' and status in ('pending','running') limit 1`);
    if (busy.length && state.instagram) state.sources.instagram = { status: "failed" };
    const status = state.sources.instagram.status === "pending" ? "pending" : "done";
    const activityId = await recordArtistActivity(artistId, "latest_refresh", {}, tx);
    const [job] =
      await tx.execute(sql`insert into artist_research_jobs (artist_id,kind,status,state,activity_id)
   values (${artistId}::uuid,'latest_refresh',${status},${JSON.stringify(state)}::jsonb,${activityId}::uuid) returning id`);
    if (!job) throw new Error("Latest request was not saved");
    return String(job.id);
  });
}
