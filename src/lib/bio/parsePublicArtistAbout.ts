import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';
import { isRealBio, MAX_BIO_LENGTH } from '@/lib/bio/bioConstants';
import type { PublicArtistAbout } from './types';

/** Explicit version opt-in; old private drafts are never a public biography. */
export function parsePublicArtistAbout(value: unknown): PublicArtistAbout | null {
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (row.version !== 1 || typeof row.bio !== 'string' || !isRealBio(row.bio) || row.bio.length > MAX_BIO_LENGTH
        || !['official', 'researched'].includes(String(row.kind)) || !Array.isArray(row.sources)
        || !row.sources.length || row.sources.length > 40) return null;
    const sources: PublicArtistAbout['sources'] = [];
    for (const source of row.sources) {
        if (!source || typeof source !== 'object' || typeof source.id !== 'string'
            || typeof source.url !== 'string' || !/^https?:\/\//.test(source.url)
            || !normalizePublicUrl(source.url) || typeof source.label !== 'string' || source.label.length > 500) return null;
        sources.push({id: source.id, url: source.url, label: source.label});
    }
    return { bio: row.bio, kind: row.kind as PublicArtistAbout['kind'], sources };
}
