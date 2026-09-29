import { sql } from "drizzle-orm";
import { withScopedArtistWrite } from "../queries/ownershipWrites";
import { recordArtistActivity } from "../activity/recordArtistActivity";
import { getArtistOperationOwnership } from "../artistOperationContext";
import { LATEST_SOURCES, type LatestRefreshState } from "@/lib/latest/types";

/** Caller supplies authenticated operation context; the artist lock serializes the cooldown. */
export async function requestLatestRefresh(artistId: string) {
  const context = getArtistOperationOwnership(artistId);
  if (!context?.userId) throw new Error("Missing Latest requester");
  return withScopedArtistWrite(artistId, async (tx) => {
    const existing =
      await tx.execute(sql`select id from artist_research_jobs where artist_id=${artistId}::uuid and kind='latest_refresh'
   and (status in ('pending','running') or created_at>now()-interval '30 minutes') order by created_at desc limit 1`);
    if (existing.length) return String(existing[0].id);
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
    // Existing research already owns Instagram. Do not launch a competing paid check.
    const busy =
      await tx.execute(sql`select id from artist_research_jobs where artist_id=${artistId}::uuid
   and kind='social_ingest' and status in ('pending','running') limit 1`);
    if (busy.length && state.instagram)
      state.sources.instagram = { status: "failed" };
    const activityId = await recordArtistActivity(
      artistId,
      "latest_refresh",
      {},
      tx,
    );
    const [job] =
      await tx.execute(sql`insert into artist_research_jobs (artist_id,kind,state,activity_id)
   values (${artistId}::uuid,'latest_refresh',${JSON.stringify(state)}::jsonb,${activityId}::uuid) returning id`);
    if (!job) throw new Error("Latest request was not saved");
    return String(job.id);
  });
}
