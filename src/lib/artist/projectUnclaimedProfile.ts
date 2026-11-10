import type { PublicArtistAbout } from '@/lib/bio/types';
import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';
import { projectPublicLoreSources } from '@/lib/sources/projectPublicLoreSources';
import { isDestinationSource } from '@/lib/musicLinks/isDestinationSource';

/** Public pre-claim projection: destinations remain, only independently eligible About is public. */
export function projectUnclaimedProfile<A extends { bio: string | null }, S extends { url: string; type?: string | null; podcastEpisodeKey?: string | null; filePath?: string | null; status?: string; publication?: string | null }>(artist: A, sources: S[], publicAbout?: PublicArtistAbout | null) {
  return {
    artist: { ...artist, bio: publicAbout?.bio ?? null },
    sources: sources.flatMap(source => {
      const published = projectPublicLoreSources([source], false);
      if (published.length) return published;
      if (source.publication === 'private' || (source.publication != null && source.publication !== 'inherit') ||
        (source.status != null && source.status !== 'approved') || source.filePath ||
        !normalizePublicUrl(source.url) || !isDestinationSource(source, sources)) return [];
      return [{
      ...source, title: new URL(normalizePublicUrl(source.url)!).hostname, snippet: null, extractedText: null,
      fileName: null, filePath: null, fileSize: null, contentType: null, ogImage: null,
      podcastShowTitle: null, podcastEpisodeTitle: null,
      }];
    }),
  };
}
