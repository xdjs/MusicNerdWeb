import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';

/** A flat image invitation, never a promise of playback or an independent control. */
export function getShareCallToAction(name: string, treatment: 'know' | 'music' | 'meet' = 'know'): string {
    const supported = getShareArtistName(name);
    const subject = Array.from(supported).length > 16 || supported === 'Discover this artist' || supported === 'Unknown Artist' ? 'the artist' : supported;
    return treatment === 'music' ? 'Explore their music' : treatment === 'meet' ? `Meet ${subject}` : `Get to know ${subject}`;
}
