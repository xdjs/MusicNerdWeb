/**
 * In Process timeline: the shared types and labels. Pure helpers each live in
 * their own file (extractInProcessAddress, inProcessProfileUrl, fetchableUrl,
 * momentKind, momentUrl, normalizeMoment); the fetch is in
 * server/utils/fetchArtistTimeline.ts.
 *
 * Tracking issue: xdjs/MusicNerdWeb#1228. Design record:
 * docs/rnd/design/2026-09-10-timeline-section/.
 */

export type MomentKind = 'video' | 'audio' | 'image' | 'writing' | 'other';

export interface Moment {
    /** In Process moment id (stable across pages). */
    id: string;
    title: string;
    kind: MomentKind;
    /** Fetchable artwork URL (gateway-resolved), or null when the moment has none. */
    imageUrl: string | null;
    /** ISO 8601 timestamp from In Process. */
    createdAt: string;
    /** Where "open" goes: the moment on inprocess.world. */
    url: string;
    /** The artist's own writing about the moment, trimmed; null when they wrote none. */
    description: string | null;
}

export const MOMENT_KIND_LABELS: Record<MomentKind, string> = {
    video: 'Video',
    audio: 'Audio',
    image: 'Image',
    writing: 'Writing',
    other: 'Other',
};

/** Shape of one item in `GET https://api.inprocess.world/api/timeline`. Only the fields we read. */
export interface RawTimelineMoment {
    id?: unknown;
    address?: unknown;
    token_id?: unknown;
    chain_id?: unknown;
    created_at?: unknown;
    hidden?: unknown;
    collection?: { name?: unknown } | null;
    metadata?: {
        name?: unknown;
        image?: unknown;
        description?: unknown;
        content?: { mime?: unknown } | null;
    } | null;
}
