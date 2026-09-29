import { withArtistOperation } from "../artistOperationContext";
import { OwnershipChangedError, withScopedArtistWrite } from "../queries/ownershipWrites";
import { sql } from "drizzle-orm";
import type { ResearchJob } from "../queries/researchJobQueries";
import type { LatestRefreshState } from "@/lib/latest/types";
/** Recheck live ownership and connected identities before each worker slice. */
export async function authorizeLatestRefresh(job: ResearchJob) {
  const state = job.state as unknown as LatestRefreshState;
  if (!job.activityId || !state.userId || !Object.hasOwn(state, "claimId"))
    throw new Error("Missing Latest attribution");
  return withArtistOperation(
    job.artistId,
    {
      userId: state.userId,
      expectedClaimId: state.claimId,
      activityId: job.activityId,
      trigger: "manual_latest_refresh",
    },
    () =>
      withScopedArtistWrite(job.artistId, async (tx) => {
        const rows =
          await tx.execute(sql`select a.id from artists a join artist_activity_events e on e.id=${job.activityId}::uuid
    where a.id=${job.artistId}::uuid and e.artist_id=a.id and e.actor_user_id=${state.userId}::uuid
    and coalesce(a.instagram,'')=${state.instagram ?? ""} and coalesce(a.inprocess,'')=${state.inprocess ?? ""}
    and coalesce(a.spotify,'')=${state.spotify ?? ""} and coalesce(a.deezer,'')=${state.deezer ?? ""}`);
        if (!rows.length)
          throw new OwnershipChangedError();
      }),
  );
}
