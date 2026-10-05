import { isMusicSource } from './isMusicSource';
import { parseMusicDestination } from './parseMusicDestination';

/** Destination placement preserves explicit spoken sources and ambiguous audio. */
export function isDestinationSource(source: { url: string; type?: string | null; podcastEpisodeKey?: string | null }): boolean {
  if (source.podcastEpisodeKey) return false;
  return parseMusicDestination(source.url) ? isMusicSource(source) : source.type === 'website';
}
