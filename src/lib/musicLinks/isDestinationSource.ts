import { isMusicSource } from './isMusicSource';
import { parseMusicDestination } from './parseMusicDestination';

/** Artist destinations belong in Links/Support; individual releases remain Lore sources. */
export function isDestinationSource(source: { url: string; type?: string | null; podcastEpisodeKey?: string | null }): boolean {
  if (source.podcastEpisodeKey) return false;
  const destination = parseMusicDestination(source.url);
  return destination
    ? destination.kind === 'artist' && isMusicSource(source)
    : source.type === 'website';
}
