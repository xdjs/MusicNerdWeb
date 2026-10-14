import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';
import { isDestinationSource } from '@/lib/musicLinks/isDestinationSource';

/** Public pre-claim projection: destinations remain, prepared narrative does not. */
export function projectUnclaimedProfile<A extends { bio: string | null }, S extends { url: string; type?: string | null; podcastEpisodeKey?: string | null; filePath?: string | null }>(artist: A, sources: S[]) {
  return {
    artist: { ...artist, bio: null },
    sources: sources.filter(source => !source.filePath && !!normalizePublicUrl(source.url) && isDestinationSource(source)).map(source => ({
      ...source, title: new URL(normalizePublicUrl(source.url)!).hostname, snippet: null, extractedText: null,
      fileName: null, filePath: null, fileSize: null, contentType: null, ogImage: null,
      podcastShowTitle: null, podcastEpisodeTitle: null,
    })),
  };
}
