/**
 * In Process timeline: types and pure helpers shared by the server fetcher and
 * the Timeline section. No I/O here; see server/utils/fetchArtistTimeline.ts.
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
}

export const MOMENT_KIND_LABELS: Record<MomentKind, string> = {
    video: 'Video',
    audio: 'Audio',
    image: 'Image',
    writing: 'Writing',
    other: 'Other',
};

/** Mirrors the `inprocess` urlmap regex (drizzle/0024_artist_profile_protection.sql). */
const IN_PROCESS_PROFILE_URL = /^https?:\/\/(?:www\.)?inprocess\.world\/(0x[a-fA-F0-9]{40})\/?(?:[?#].*)?$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

/**
 * The 0x address behind `artists.inprocess`, lower-cased. The column stores the urlmap
 * capture group, which for In Process is the bare address (the profile URL is rebuilt
 * from `app_string_format` for display), so a bare address is the common input; a full
 * profile URL is accepted too. Null for anything else.
 */
export function extractInProcessAddress(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (ADDRESS.test(trimmed)) return trimmed.toLowerCase();
    const match = IN_PROCESS_PROFILE_URL.exec(trimmed);
    return match ? match[1].toLowerCase() : null;
}

/** The artist's public In Process page, the same shape the Links grid renders. */
export function inProcessProfileUrl(address: string): string {
    return `https://www.inprocess.world/${address}`;
}

// Same gateways In Process's own web app resolves through (web/lib/protocolSdk/ipfs/gateway.ts),
// except Arweave: ar-io.net was unreachable from here, and arweave.net redirects to the same bytes.
const ARWEAVE_GATEWAY = 'https://arweave.net';
const IPFS_GATEWAY = 'https://magic.decentralized-content.com';

/** Turn an `ar://`, `ipfs://` or https URI into something an <img> can load. Insecure and unknown schemes return null. */
export function fetchableUrl(uri: string | null | undefined): string | null {
    if (!uri || typeof uri !== 'string') return null;
    const trimmed = uri.trim();
    if (trimmed.startsWith('ar://')) {
        const id = trimmed.slice('ar://'.length);
        return id && id !== 'undefined' ? `${ARWEAVE_GATEWAY}/${id}` : null;
    }
    if (trimmed.startsWith('ipfs://')) {
        const cid = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '');
        return cid ? `${IPFS_GATEWAY}/ipfs/${cid}` : null;
    }
    if (/^https:\/\//.test(trimmed)) return trimmed;
    return null;
}

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

/** Chain id → the short name In Process uses in `/collect/<chain>:<address>/<tokenId>`. */
const CHAIN_SHORT_NAMES: Record<number, string> = {
    8453: 'base',
    84532: 'bsep',
    1: 'eth',
    10: 'op',
    7777777: 'zora',
};

export function momentUrl(chainId: number | null | undefined, address: string, tokenId: string, fallback: string): string {
    const chain = chainId ? CHAIN_SHORT_NAMES[chainId] : undefined;
    return chain ? `https://www.inprocess.world/collect/${chain}:${address}/${tokenId}` : fallback;
}

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
        content?: { mime?: unknown } | null;
    } | null;
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * One raw timeline item → a Moment, or null when it cannot be shown (no id or date,
 * or hidden by the artist). `artistAddress` is the profile address the timeline was
 * fetched for; `artistUrl` is the fallback link when the chain is unknown.
 */
export function normalizeMoment(raw: RawTimelineMoment, artistAddress: string, artistUrl: string): Moment | null {
    const id = str(raw.id);
    const createdAt = str(raw.created_at);
    const address = str(raw.address);
    const tokenId = raw.token_id == null ? null : String(raw.token_id);
    if (!id || !createdAt || !address || !tokenId) return null;

    const hidden = Array.isArray(raw.hidden) ? raw.hidden : [];
    if (hidden.some(entry => typeof entry === 'string' && entry.toLowerCase() === artistAddress.toLowerCase())) return null;

    const metadata = raw.metadata ?? {};
    const chainId = typeof raw.chain_id === 'number' ? raw.chain_id : null;
    return {
        id,
        title: str(metadata.name) ?? str(raw.collection?.name) ?? 'Untitled moment',
        kind: momentKind(str(metadata.content?.mime)),
        imageUrl: fetchableUrl(str(metadata.image)),
        createdAt,
        url: momentUrl(chainId, address, tokenId, artistUrl),
    };
}
