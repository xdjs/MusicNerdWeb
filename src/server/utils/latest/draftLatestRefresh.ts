import { sql } from "drizzle-orm";
import { latestRefreshScopeSql } from "./latestRefreshScopeSql";
import { findLatestRefreshId } from "./findLatestRefreshId";
import { withScopedArtistWrite } from "../queries/ownershipWrites";
import type { ArtistOperationOwnership } from "../artistOperationContext";
import { LATEST_SOURCES, type LatestRefreshState } from "@/lib/latest/types";

/**
 * Under the artist lock: release obsolete Latest jobs, return the live or
 * cooling-down request if there is one, otherwise the new request's state
 * from the artist's current connections.
 *
 * @param artistId - The artist.
 * @param context - The requester and the claim they asked under.
 * @returns The existing job id, or the state to check and queue.
 */
export async function draftLatestRefresh(
  artistId: string,
  context: ArtistOperationOwnership,
): Promise<string | LatestRefreshState> {
  return withScopedArtistWrite(artistId, async (tx) => {
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
    return {
      claimId: context.expectedClaimId,
      userId: context.userId!,
      instagram: String(artist.instagram ?? ""),
      inprocess: String(artist.inprocess ?? ""),
      spotify: String(artist.spotify ?? ""),
      deezer: String(artist.deezer ?? ""),
      sources: Object.fromEntries(
        LATEST_SOURCES.map((s) => [
          s,
          { status: s === "interviews" || artist[s] ? "pending" : "disconnected" },
        ]),
      ) as LatestRefreshState["sources"],
    };
  });
}
