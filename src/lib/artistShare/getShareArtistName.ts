import { shareFontCoverage } from '@/lib/artistShare/shareFontCoverage';

/** Preserve supported names; never initiate next/og's implicit font/emoji fetches. */
export function getShareArtistName(name: string): string {
    const normalized = name.normalize('NFC').trim().replace(/\s+/g, ' ') || 'Unknown Artist';
    const supported = Array.from(normalized).every(character => {
        const point = character.codePointAt(0)!;
        return point >= 32 && shareFontCoverage.some(([start, end]) => point >= start && point <= end);
    });
    return supported ? normalized : 'Discover this artist';
}
