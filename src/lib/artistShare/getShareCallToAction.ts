import { getShareArtistName } from '@/lib/artistShare/getShareArtistName';

/** A flat image invitation, never a promise of playback or an independent control. */
export function getShareCallToAction(name: string, treatment: 'know' | 'music' | 'meet' | 'explore' | 'story' | 'read' = 'know', hasPublicBio = false): string {
    const supported = getShareArtistName(name);
    const subject = Array.from(supported).length > 16 || supported === 'Discover this artist' || supported === 'Unknown Artist' ? 'the artist' : supported;
    if (treatment === 'read' && hasPublicBio) return 'Read their story';
    if (treatment === 'story' && hasPublicBio) return 'Their music. Their story.';
    if (treatment === 'explore') return `Explore ${subject}`;
    return treatment === 'music' ? 'Explore their music' : treatment === 'meet' ? `Meet ${subject}` : `Get to know ${subject}`;
}
