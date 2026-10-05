import { parseMusicDestination } from './parseMusicDestination';

/** Destination placement is independent of a historical source's guessed type. */
export function isDestinationSource(source: { url: string; type?: string | null; podcastEpisodeKey?: string | null }): boolean {
  const destination = parseMusicDestination(source.url);
  const spoken = source.type === 'interview' && ['soundcloud', 'mixcloud', 'audius'].includes(destination?.platform ?? '');
  return !source.podcastEpisodeKey && !spoken && (source.type === 'website' || !!destination);
}
