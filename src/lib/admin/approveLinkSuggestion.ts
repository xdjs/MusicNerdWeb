import { requestArtistLinkReview } from '@/lib/artistLinkReview/requestArtistLinkReview';
import { readAdminResponse } from './readAdminResponse';

/**
 * Approve a pending link suggestion on its artist, as an admin.
 *
 * @param artistId - The artist the suggestion is for.
 * @param ugcId - The suggestion.
 * @returns Nothing; throws the API's message when it was not approved.
 */
export async function approveLinkSuggestion(artistId: string, ugcId: string): Promise<void> {
  const response = await requestArtistLinkReview(artistId, { id: ugcId, kind: 'ugc', decision: 'approve' });
  await readAdminResponse(response, 'Could not approve this link.');
}
