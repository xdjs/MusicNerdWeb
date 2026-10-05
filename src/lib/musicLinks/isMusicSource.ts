import { parseMusicDestination } from './parseMusicDestination';

/** Preserve explicit audio evidence on mixed hosts; their releases need a positive music classification. */
export function isMusicSource(source: {url: string; type?: string | null; podcastEpisodeKey?: string | null}): boolean {
  if (source.podcastEpisodeKey) return false;
  const destination = parseMusicDestination(source.url);
  if (!destination) return false;
  if (['soundcloud', 'mixcloud', 'audius'].includes(destination.platform)) {
    if (source.type === 'interview' || source.type === 'audio') return false;
    if (destination.kind === 'release') return source.type === 'music';
  }
  return true;
}
