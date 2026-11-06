import { hasShareFontCoverage } from '@/lib/artistShare/hasShareFontCoverage';

/** Preserve supported names; never initiate next/og's implicit font/emoji fetches. */
export function getShareArtistName(name: string): string {
    const normalized = name.normalize('NFC').trim().replace(/\s+/g, ' ') || 'Unknown Artist';
    return hasShareFontCoverage(normalized) ? normalized : 'Discover this artist';
}
