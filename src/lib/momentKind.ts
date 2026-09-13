import type { MomentKind } from '@/lib/inprocessTimeline';

/** Content type → the badge kind on the card. */
export function momentKind(mime: string | null | undefined): MomentKind {
    if (!mime) return 'other';
    const type = mime.toLowerCase();
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf' || type.startsWith('text/')) return 'writing';
    return 'other';
}
