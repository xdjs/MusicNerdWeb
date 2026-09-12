import axios from 'axios';
import type { ProfileLink } from '@/lib/artistProfileLinks';
import { latestDateSortTime } from '@/lib/artistLatest';
import type { Artist } from '@/server/db/DbTypes';
import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { getSpotifyHeaders } from '@/server/utils/queries/externalApiQueries';
import { withCatalogBudget } from './catalogBudget';

export type LatestRelease = {
    id: string;
    title: string;
    /** Keep the provider's precision: YYYY, YYYY-MM, or YYYY-MM-DD. */
    releaseDate: string;
    imageUrl: string | null;
    url: string;
    kind: string;
    platform: 'deezer' | 'spotify';
    listeningLinks?: ProfileLink[];
};

const CATALOG_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 5000;
type RecordValue = Record<string, unknown>;

function object(value: unknown): RecordValue | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as RecordValue : null;
}

function httpsUrl(value: unknown): URL | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
    } catch {
        return null;
    }
}

function sourceUrl(value: unknown, platform: LatestRelease['platform'], id: string): string | null {
    const url = httpsUrl(value);
    if (!url) return null;
    const valid = platform === 'deezer'
        ? ['deezer.com', 'www.deezer.com'].includes(url.hostname)
            && new RegExp(`^/(?:[a-z]{2}/)?album/${id}/?$`).test(url.pathname)
        : url.hostname === 'open.spotify.com' && url.pathname === `/album/${id}`;
    return valid ? url.toString() : null;
}

function imageUrl(value: unknown, platform: LatestRelease['platform']): string | null {
    const url = httpsUrl(value);
    if (!url) return null;
    const host = url.hostname;
    const valid = platform === 'deezer'
        ? host === 'api.deezer.com' || host === 'dzcdn.net' || host.endsWith('.dzcdn.net')
        : host === 'scdn.co' || host.endsWith('.scdn.co') || host.endsWith('.spotifycdn.com');
    return valid ? url.toString() : null;
}

/** A partial date proves release only once its entire period has passed. Do not
 * invent January 1 / the first of a month for ordering or public display. */
function isReleased(value: string, today: string): boolean {
    const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = match[2] ? Number(match[2]) : 12;
    if (year < 1000 || month < 1 || month > 12) return false;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const day = match[3] ? Number(match[3]) : lastDay;
    if (day < 1 || day > lastDay) return false;
    return `${match[1]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` <= today;
}

function normalize(value: unknown, platform: LatestRelease['platform']): LatestRelease | null {
    const release = object(value);
    if (!release) return null;
    const id = typeof release.id === 'string' ? release.id
        : typeof release.id === 'number' && Number.isSafeInteger(release.id) ? String(release.id) : '';
    if (!(platform === 'deezer' ? /^[1-9]\d*$/.test(id) : /^[a-zA-Z0-9]{22}$/.test(id))) return null;
    const title = platform === 'deezer' ? release.title : release.name;
    const kind = platform === 'deezer' ? release.record_type : release.album_type;
    if (typeof title !== 'string' || !title.trim() || typeof release.release_date !== 'string') return null;
    if (kind !== 'album' && kind !== 'single' && !(platform === 'deezer' && kind === 'ep')) return null;
    if (platform === 'spotify' && release.album_group === 'appears_on') return null;
    const url = sourceUrl(platform === 'deezer' ? release.link : object(release.external_urls)?.spotify, platform, id);
    if (!url) return null;
    const covers = platform === 'deezer'
        ? [release.cover_big, release.cover_xl, release.cover_medium, release.cover]
        : Array.isArray(release.images) ? release.images.map((image) => object(image)?.url) : [];
    return {
        id,
        title: title.trim(),
        releaseDate: release.release_date,
        imageUrl: covers.map((cover) => imageUrl(cover, platform)).find((cover) => cover !== null) ?? null,
        url,
        kind,
        platform,
    };
}

// Cache the bounded catalog, not the time-sensitive selection, so an upcoming
// release can become eligible even while its catalog response is cached.
const getCatalog = cachedOrDirect(async (platform: LatestRelease['platform'], id: string): Promise<LatestRelease[]> => {
    return withCatalogBudget(platform, async (signal) => {
        const config = { timeout: REQUEST_TIMEOUT_MS, signal };
        const headers = platform === 'spotify' ? await getSpotifyHeaders() : {};
        // Token acquisition may finish after the budget's deadline. Never start
        // a catalog request after its slot has been released.
        signal.throwIfAborted();
        const response = platform === 'deezer'
            ? await axios.get(`https://api.deezer.com/artist/${id}/albums?limit=${CATALOG_LIMIT}`, config)
            : await axios.get(
                `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album%2Csingle&limit=${CATALOG_LIMIT}&market=US`,
                { ...headers, ...config },
            );
        const data = object(response.data);
        const items = data?.[platform === 'deezer' ? 'data' : 'items'];
        if (!data || data.error || !Array.isArray(items)) throw new Error(`Invalid ${platform} release catalog`);
        return items.slice(0, CATALOG_LIMIT).map((item) => normalize(item, platform))
            .filter((item): item is LatestRelease => item !== null);
    });
}, ['artist-latest-release-catalog-v2'], { revalidate: 86400 });

/** Known IDs only: never match artists or artwork by name. This is a bounded
 * latest-release preview, not a paginated discography. Empty successful catalogs
 * remain distinct from unavailable providers so the caller can show a retry. */
export async function getLatestArtistReleases(artist: Pick<Artist, 'deezer' | 'spotify'>): Promise<LatestRelease[]> {
    const providers: Array<[LatestRelease['platform'], string]> = [];
    if (artist.deezer && /^[1-9]\d*$/.test(artist.deezer)) providers.push(['deezer', artist.deezer]);
    if (artist.spotify && /^[a-zA-Z0-9]{22}$/.test(artist.spotify)) providers.push(['spotify', artist.spotify]);
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const results = await Promise.allSettled(providers.map(([platform, id]) => getCatalog(platform, id)));
    if (providers.length && results.every(result => result.status === 'rejected')) {
        throw new AggregateError(results.map(result => result.status === 'rejected' ? result.reason : null), 'Artist release providers unavailable');
    }
    const groups = new Map<string, LatestRelease>();
    // Both catalogs belong to known artist IDs. Match exact title, date and kind;
    // never collapse a remaster/deluxe edition or an ambiguous partial date.
    for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        for (const release of result.value) {
            if (!isReleased(release.releaseDate, today) || latestDateSortTime(release.releaseDate) > now) continue;
            const key = `${release.title.trim().toLocaleLowerCase('en-US')}|${release.releaseDate}|${release.kind}`;
            const link: ProfileLink = {
                siteName: release.platform, href: release.url,
                label: release.platform === 'deezer' ? 'Deezer' : 'Spotify',
                iconSrc: `/siteIcons/${release.platform}_icon.svg`,
            };
            const existing = groups.get(key);
            if (existing) {
                if (!existing.listeningLinks?.some(item => item.siteName === link.siteName)) existing.listeningLinks?.push(link);
            } else groups.set(key, { ...release, listeningLinks: [link] });
        }
    }
    return [...groups.values()]
        .sort((a, b) => latestDateSortTime(b.releaseDate) - latestDateSortTime(a.releaseDate) || a.id.localeCompare(b.id))
        .slice(0, 3);
}
