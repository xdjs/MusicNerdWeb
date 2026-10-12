import { getArtistOperationOwnership } from "../artistOperationContext";
import { draftLatestRefresh } from "./draftLatestRefresh";
import { saveLatestRefresh } from "./saveLatestRefresh";

/** Queue all connected sources for the API worker; no provider fetches in this request. */
export async function requestLatestRefresh(artistId: string) {
  const context = getArtistOperationOwnership(artistId);
  if (!context?.userId) throw new Error("Missing Latest requester");
  // A connection changed during the checks means they checked the wrong
  // identities: check the current ones once more rather than queue a job that
  // is out of scope the moment it is saved.
  for (let attempt = 0; attempt < 2; attempt++) {
    const draft = await draftLatestRefresh(artistId, context);
    if (typeof draft === "string") return draft;
    const state = draft;
    const id = await saveLatestRefresh(artistId, state);
    if (id) return id;
  }
  throw new Error("Connections changed while Latest was checking");
}
