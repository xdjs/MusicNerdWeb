import type { ArtistVaultSource } from '@/server/db/DbTypes';

type ReviewSource = Pick<ArtistVaultSource, 'id' | 'url' | 'type' | 'status' | 'podcastEpisodeKey'>;

/** Reset optimistic editor lists only when server membership or classification changes. */
export function getSourceReviewKey(
  artistId: string,
  section: 'links' | 'support' | 'lore',
  pending: ReviewSource[],
  approved: ReviewSource[],
): string {
  const identity = (sources: ReviewSource[]) => sources
    .map(source => [source.id, source.url, source.type, source.status, source.podcastEpisodeKey] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify([artistId, section, identity(pending), identity(approved)]);
}
