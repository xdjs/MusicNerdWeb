import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';

/** One stored identity for URLs that differ only by fragment or serialization. */
export function canonicalizeLoreUrl(input: string): string | null {
    const normalized = normalizePublicUrl(input);
    if (!normalized) return null;
    const url = new URL(normalized);
    url.hash = '';
    return url.href;
}
