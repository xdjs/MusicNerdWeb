import { getArtistOperationOwnership } from "../artistOperationContext";
import { checkLatestSources } from "./checkLatestSources";
import { draftLatestRefresh } from "./draftLatestRefresh";
import { saveLatestRefresh } from "./saveLatestRefresh";

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
  // A connection changed during the checks means they checked the wrong
  // identities: check the current ones once more rather than queue a job that
  // is out of scope the moment it is saved.
  for (let attempt = 0; attempt < 2; attempt++) {
    const draft = await draftLatestRefresh(artistId, context);
    if (typeof draft === "string") return draft;
    const state = { ...draft, sources: await checkLatestSources(artistId, draft) };
    const id = await saveLatestRefresh(artistId, state);
    if (id) return id;
  }
  throw new Error("Connections changed while Latest was checking");
}
