import { normalizePublicUrl } from './normalizePublicUrl';

/** Compare URL serialization without merging distinct paths, queries or hash routes. */
export function canonicalizeDestinationUrl(input: string): string | null {
    const normalized = normalizePublicUrl(input);
    return normalized ? new URL(normalized).href : null;
}
