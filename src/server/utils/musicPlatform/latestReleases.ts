import axios from 'axios';
import type { Artist } from '@/server/db/DbTypes';
import { cachedOrDirect } from '@/server/lib/cachedOrDirect';
import { getSpotifyHeaders } from '@/server/utils/queries/externalApiQueries';

export type LatestRelease = {
    id: string;
    title: string;
    /** Keep the provider's precision: YYYY, YYYY-MM, or YYYY-MM-DD. */
    releaseDate: string;
    imageUrl: string | null;
    url: string;
    kind: string;
    platform: 'deezer' | 'spotify';
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

async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            operation(controller.signal),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    controller.abort();
                    reject(new Error('Release catalog request timed out'));
                }, REQUEST_TIMEOUT_MS);
            }),
        ]);
    } finally {
        clearTimeout(timer);
    }
}

// Cache the bounded catalog, not the time-sensitive selection, so an upcoming
// release can become eligible even while its catalog response is cached.
const getCatalog = cachedOrDirect(async (platform: LatestRelease['platform'], id: string): Promise<LatestRelease[]> => {
    return bounded(async (signal) => {
        const config = { timeout: REQUEST_TIMEOUT_MS, signal };
        const response = platform === 'deezer'
            ? await axios.get(`https://api.deezer.com/artist/${id}/albums?limit=${CATALOG_LIMIT}`, config)
            : await axios.get(
                `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album%2Csingle&limit=${CATALOG_LIMIT}&market=US`,
                { ...await getSpotifyHeaders(), ...config },
            );
        const data = object(response.data);
        const items = data?.[platform === 'deezer' ? 'data' : 'items'];
        if (!data || data.error || !Array.isArray(items)) throw new Error(`Invalid ${platform} release catalog`);
        return items.slice(0, CATALOG_LIMIT).map((item) => normalize(item, platform))
            .filter((item): item is LatestRelease => item !== null);
    });
}, ['artist-latest-release-catalog-v1'], { revalidate: 3600 });

/** Known IDs only: never match artists or artwork by name. This is a bounded
 * latest-release preview, not a paginated discography. Empty successful catalogs
 * remain distinct from unavailable providers so the caller can show a retry. */
export async function getLatestArtistReleases(artist: Pick<Artist, 'deezer' | 'spotify'>): Promise<LatestRelease[]> {
    const providers: Array<[LatestRelease['platform'], string]> = [];
    if (artist.deezer && /^[1-9]\d*$/.test(artist.deezer)) providers.push(['deezer', artist.deezer]);
    if (artist.spotify && /^[a-zA-Z0-9]{22}$/.test(artist.spotify)) providers.push(['spotify', artist.spotify]);
    const errors: unknown[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const [platform, id] of providers) {
        try {
            const catalog = await getCatalog(platform, id);
            const seen = new Set<string>();
            const releases = catalog.filter((release) => isReleased(release.releaseDate, today))
                .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.id.localeCompare(b.id))
                .filter((release) => {
                    const key = `${release.title.toLocaleLowerCase('en-US')}|${release.releaseDate}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                }).slice(0, 3);
            if (releases.length) return releases;
        } catch (error) {
            errors.push(error);
        }
    }
    if (providers.length && errors.length === providers.length) {
        throw new AggregateError(errors, 'Artist release providers unavailable');
    }
    return [];
}
