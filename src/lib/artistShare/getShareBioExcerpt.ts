import { sanitizeBioText } from '@/lib/bio/bioText';
import { hasShareFontCoverage } from '@/lib/artistShare/hasShareFontCoverage';

/** A contiguous public excerpt, never a generated summary or invented biography. */
export function getShareBioExcerpt(bio: string | null | undefined, max = 160): string | null {
    const text = sanitizeBioText(bio).normalize('NFC').replace(/\*\*|__/g, '').replace(/(?<!\w)[*_]([^*_]+)[*_](?!\w)/g, '$1').trim().replace(/\s+/g, ' ');
    if (!text) return null;
    const chars = Array.from(text);
    let excerpt = text;
    if (chars.length > max) {
        const prefix = chars.slice(0, max - 1).join('');
        const boundary = prefix.lastIndexOf(' ');
        excerpt = `${(boundary > max / 2 ? prefix.slice(0, boundary) : prefix).trimEnd()}…`;
    }
    return hasShareFontCoverage(excerpt) ? excerpt : null;
}
