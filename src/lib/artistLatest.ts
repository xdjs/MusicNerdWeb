import type { ProfileLink } from '@/lib/artistProfileLinks';

export type LatestKind = 'release' | 'instagram' | 'interview';

export interface ArtistLatestItem {
    id: string;
    kind: LatestKind;
    title: string;
    text: string;
    date: string;
    imageUrl: string | null;
    imageCaption: string;
    sourceUrl: string | null;
    sourceLabel: string;
    listeningLinks?: ProfileLink[];
}

/** Links come from stored sources or catalog responses, never generated prose. */
export function latestExternalUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
        return null;
    }
}

export function instagramPostUrl(value: unknown): string | null {
    const safe = latestExternalUrl(value);
    if (!safe) return null;
    const url = new URL(safe);
    return /^(www\.)?instagram\.com$/.test(url.hostname)
        && /^\/(p|reel|tv)\/[^/]+\/?$/.test(url.pathname) ? safe : null;
}

/** Apify stores the original post payload in raw; don't send that payload to the client. */
export function instagramPostImage(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const post = raw as Record<string, unknown>;
    const candidates = [post.displayUrl, post.thumbnailSrc, ...(Array.isArray(post.images) ? post.images : [])];
    for (const candidate of candidates) {
        const url = latestExternalUrl(candidate);
        if (url) return url;
    }
    return null;
}

export function latestDateLabel(value: string): string {
    // Catalogs sometimes know only the year/month. Do not invent a day in the label.
    if (/^\d{4}$/.test(value)) return value;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', ...(/^\d{4}-\d{2}$/.test(value) ? {} : { day: 'numeric' as const }),
        timeZone: 'UTC',
    }).format(date);
}

/** Editorial placement for imprecise dates: the end of their known period,
 * rather than an invented January 1 / first day. Keep the original date for
 * display, and withhold an incomplete period because it may still be future. */
export function latestDateSortTime(value: string): number {
    const partial = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
    if (!partial) return Date.parse(value);
    const year = Number(partial[1]);
    const month = partial[2] ? Number(partial[2]) : 12;
    if (year < 1000 || month < 1 || month > 12) return NaN;
    return Date.UTC(year, month, 1) - 1;
}

export function orderLatestItems(items: ArtistLatestItem[], now = Date.now()): ArtistLatestItem[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const date = latestDateSortTime(item.date);
        if (!Number.isFinite(date) || date > now || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    }).sort((a, b) => latestDateSortTime(b.date) - latestDateSortTime(a.date) || a.id.localeCompare(b.id));
}
