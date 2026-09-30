import { latestRefreshScopeSql } from "./latestRefreshScopeSql";
import { sql } from "drizzle-orm";
import { withScopedArtistWrite } from "../queries/ownershipWrites";
import { recordArtistActivity } from "../activity/recordArtistActivity";
import { getArtistOperationOwnership } from "../artistOperationContext";
import { checkLatestSources } from "./checkLatestSources";
import { findLatestRefreshId } from "./findLatestRefreshId";
import { LATEST_SOURCES, type LatestRefreshState } from "@/lib/latest/types";

/**
 * Caller supplies authenticated operation context; the artist lock serializes the cooldown.
 *
 * The quick sources (In Process, Spotify, Deezer, published answers) are
 * checked here, outside the lock, because they expire this app's own cache.
 * The job that is queued carries only the Instagram check, which MusicNerdAPI
 * runs (#1365); with nothing for Instagram to do, it is saved as done.
 */
export async function requestLatestRefresh(artistId: string) {
  const context = getArtistOperationOwnership(artistId);
  if (!context?.userId) throw new Error("Missing Latest requester");
  const draft = await withScopedArtistWrite(artistId, async (tx) => {
    // Release obsolete leases while holding the same artist lock as enqueueing.
    await tx.execute(sql`update artist_research_jobs j set status='failed',claimed_at=null,
      last_error='Refresh scope changed',updated_at=now() from artists a
      where j.artist_id=a.id and a.id=${artistId}::uuid and j.kind='latest_refresh'
      and j.status in ('pending','running') and (${latestRefreshScopeSql()}) is not true`);
    const existing = await findLatestRefreshId(tx, artistId);
    if (existing) return existing;
    const [artist] = await tx.execute(
      sql`select instagram,inprocess,spotify,deezer from artists where id=${artistId}::uuid`,
    );
    if (!artist) throw new Error("Artist not found");
    const state: LatestRefreshState = {
      claimId: context.expectedClaimId,
      userId: context.userId!,
      instagram: String(artist.instagram ?? ""),
      inprocess: String(artist.inprocess ?? ""),
      spotify: String(artist.spotify ?? ""),
      deezer: String(artist.deezer ?? ""),
      sources: Object.fromEntries(
        LATEST_SOURCES.map((s) => [
          s,
          {
            status:
              s === "interviews" || artist[s] ? "pending" : "disconnected",
          },
        ]),
      ) as LatestRefreshState["sources"],
    };
    return state;
  });
  if (typeof draft === "string") return draft;
  const state = { ...draft, sources: await checkLatestSources(artistId, draft) };
  return withScopedArtistWrite(artistId, async (tx) => {
    // A simultaneous request may have queued first; it wins, and this one's checks still expired the caches.
    const existing = await findLatestRefreshId(tx, artistId);
    if (existing) return existing;
    // Existing research already owns Instagram. Do not launch a competing paid check.
    // Checked under the same lock as the insert, so a scrape queued during the checks still counts.
    const busy =
      await tx.execute(sql`select id from artist_research_jobs where artist_id=${artistId}::uuid
   and kind='social_ingest' and status in ('pending','running') limit 1`);
    if (busy.length && state.instagram)
      state.sources.instagram = { status: "failed" };
    const status = state.sources.instagram.status === "pending" ? "pending" : "done";
    const activityId = await recordArtistActivity(
      artistId,
      "latest_refresh",
      {},
      tx,
    );
    const [job] =
      await tx.execute(sql`insert into artist_research_jobs (artist_id,kind,status,state,activity_id)
   values (${artistId}::uuid,'latest_refresh',${status},${JSON.stringify(state)}::jsonb,${activityId}::uuid) returning id`);
    if (!job) throw new Error("Latest request was not saved");
    return String(job.id);
  });
}
