import { instagramPostUrl } from '@/lib/artist/artistLatest';
import { getInstagramMentions } from '@/lib/instagram/getInstagramMentions';

/** Evidence must be the Instagram sources actually cited by this answer, never the whole context. */
export function resolveInstagramMentions(answer: string, sources: { url: string; text: string }[]): string[] {
    const supported = new Set(sources
        .filter(source => instagramPostUrl(source.url))
        .flatMap(source => getInstagramMentions(source.text).map(mention => mention.handle)));
    return [...new Set(getInstagramMentions(answer)
        .filter(mention => supported.has(mention.handle))
        .map(mention => mention.handle))];
}
