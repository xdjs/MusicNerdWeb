import { revalidateTag } from "next/cache";
import { fetchTimelineDirect } from "../fetchTimelineDirect";
import { getLatestArtistReleases } from "../musicPlatform/latestReleases";
import { extractInProcessAddress } from "@/lib/inprocess/extractInProcessAddress";
import type {
  LatestSource,
  LatestRefreshState,
  SourceResult,
} from "@/lib/latest/types";
import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

/** Check upstream before expiring the connected identity’s cache. Failed checks leave it intact. */
export async function refreshLatestSource(
  artistId: string,
  state: Pick<LatestRefreshState, "inprocess" | "spotify" | "deezer">,
  source: LatestSource,
): Promise<SourceResult> {
  if (source === "inprocess") {
    const address = extractInProcessAddress(state.inprocess);
    if (!address) return { status: "disconnected" };
    await fetchTimelineDirect(address);
    revalidateTag(`latest:inprocess:${address}`);
  } else if (source === "spotify" || source === "deezer") {
    const id = state[source];
    if (!id) return { status: "disconnected" };
    if (!(source === "spotify" ? /^[a-zA-Z0-9]{22}$/ : /^[1-9]\d*$/).test(id)) return { status: "failed" };
    await getLatestArtistReleases({
      spotify: source === "spotify" ? id : null,
      deezer: source === "deezer" ? id : null,
    }, { fresh: true });
    revalidateTag(`latest:${source}:${id}`);
  } else if (source === "interviews") {
    // Verify the DB read; the normal Latest query controls publication visibility.
    await db.execute(
      sql`select id from artist_interview_answers where artist_id=${artistId}::uuid limit 1`,
    );
  }
  return { status: "checked", checkedAt: new Date().toISOString() };
}
