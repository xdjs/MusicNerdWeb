import { requestArtistSources, type ArtistSourcesResult } from '@/lib/source/requestArtistSources';

/** Approve or reject a source from a review queue: applied only while it is still pending. */
export function reviewLoreSource(artistId: string, sourceId: string, status: 'approved' | 'rejected'): Promise<ArtistSourcesResult> {
  return requestArtistSources(artistId, { method: 'PATCH', sourceId, body: { status, expectedStatus: 'pending' } });
}
