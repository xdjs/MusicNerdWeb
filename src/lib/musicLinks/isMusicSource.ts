import { parseMusicDestination } from './parseMusicDestination';

/** Mixed audio release URLs need a positive music classification; URL shape alone is not evidence. */
export function isMusicSource(source: {url: string; type?: string | null; podcastEpisodeKey?: string | null}): boolean {
  if (source.podcastEpisodeKey) return false;
  const destination = parseMusicDestination(source.url);
  if (!destination) return false;
  if (['soundcloud', 'mixcloud', 'audius'].includes(destination.platform)) {
    if (source.type === 'interview') return false;
    if (destination.kind === 'release') return source.type === 'music';
  }
  return true;
}
