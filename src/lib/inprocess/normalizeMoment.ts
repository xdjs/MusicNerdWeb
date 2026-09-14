import type { Moment, RawTimelineMoment } from '@/lib/inprocess/inprocessTimeline';
import { fetchableUrl } from '@/lib/inprocess/fetchableUrl';
import { momentKind } from '@/lib/inprocess/momentKind';
import { momentUrl } from '@/lib/inprocess/momentUrl';
import { str } from '@/lib/str';

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
        description: str(metadata.description),
    };
}
