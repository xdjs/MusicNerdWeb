import { refreshLatestSource } from "./refreshLatestSource";
import { LATEST_SOURCES, type LatestRefreshState } from "@/lib/latest/types";

/**
 * Update Latest's quick checks, run in the request: In Process, Spotify,
 * Deezer and published answers, in parallel. Each one expires this app's own
 * cache for its source, which is why they stay here while MusicNerdAPI runs
 * the slow Instagram check (#1365). A failure marks only its own source.
 *
 * @param artistId - The artist.
 * @param state - The request's state, with the sources to check `pending`.
 * @returns The sources, with every pending one but Instagram settled.
 */
export async function checkLatestSources(
  artistId: string,
  state: LatestRefreshState,
): Promise<LatestRefreshState["sources"]> {
  const sources = { ...state.sources };
  await Promise.all(
    LATEST_SOURCES.filter((s) => s !== "instagram" && sources[s].status === "pending").map(
      async (source) => {
        try {
          sources[source] = await refreshLatestSource(artistId, state, source);
        } catch {
          sources[source] = { status: "failed" };
        }
      },
    ),
  );
  return sources;
}
