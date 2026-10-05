import { isMusicSource } from './isMusicSource';

/** Destination placement preserves explicit spoken sources and ambiguous audio. */
export function isDestinationSource(source: { url: string; type?: string | null; podcastEpisodeKey?: string | null }): boolean {
  return !source.podcastEpisodeKey && (source.type === 'website' || isMusicSource(source));
}
