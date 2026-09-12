import { latestExternalUrl, type ArtistLatestItem } from '@/lib/artistLatest';
import type { ProfileLink } from '@/lib/artistProfileLinks';

export interface ReleaseSource { url: string; title: string | null }

/** Exact saved titles only; don't mistake a review mentioning a release for its music page. */
function titleMatches(value: string | null, title: string, artist: string): boolean {
    const normalize = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
    const actual = normalize(value ?? '');
    const name = normalize(title);
    const by = normalize(artist);
    return [name, `${name} | ${by}`, `${name}, by ${by}`, `${name} by ${by}`, `${name} - ${by}`, `${by} - ${name}`,
        `${name} - single by ${by}`, `${name} - ep by ${by}`].includes(actual);
}

function releasePlatform(url: URL, profiles: ProfileLink[]): ProfileLink | null {
    const host = url.hostname.replace(/^www\./, '');
    const path = url.pathname;
    let name: string | undefined;
    if (host === 'open.spotify.com' && /^\/album\/[a-zA-Z0-9]{22}\/?$/.test(path)) name = 'spotify';
    if (host === 'deezer.com' && /^\/(?:[a-z]{2}\/)?album\/\d+\/?$/.test(path)) name = 'deezer';
    if (host === 'music.apple.com' && /^\/(?:[a-z]{2}\/)?album\/[^/]+\/\d+\/?$/.test(path) && !url.searchParams.has('i')) name = 'applemusic';
    if (host.endsWith('.bandcamp.com') && /^\/(album|track)\/[^/]+\/?$/.test(path)) name = 'bandcamp';
    if (host === 'soundcloud.com' && /^\/[^/]+\/(?:sets\/)?[^/]+\/?$/.test(path) && !/\/(likes|reposts|tracks|albums|sets)\/?$/.test(path)) name = 'soundcloud';
    if (['youtube.com', 'music.youtube.com'].includes(host) && path === '/watch' && url.searchParams.has('v')) name = 'youtube';
    // Other supported services use the artist's saved profile as the URL boundary.
    // Accept only deeper paths with an exact matching saved title, never search links.
    if (!name) {
        const profile = profiles.find(link => {
            if (!['audius', 'mixcloud', 'subvert', 'supercollector'].includes(link.siteName)) return false;
            const safe = latestExternalUrl(link.href);
            if (!safe) return false;
            const base = new URL(safe);
            return base.hostname === url.hostname && base.pathname !== '/' && path.startsWith(`${base.pathname.replace(/\/$/, '')}/`) && path !== `${base.pathname.replace(/\/$/, '')}/`;
        });
        if (profile) return { ...profile, href: url.href };
    }
    if (!name) return null;
    const labels: Record<string, string> = { spotify: 'Spotify', deezer: 'Deezer', applemusic: 'Apple Music', bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', youtube: 'YouTube' };
    const profile = profiles.find(link => link.siteName === name);
    return { siteName: name, href: url.href, label: labels[name]!, iconSrc: profile?.iconSrc || (name === 'applemusic' ? 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/applemusic.svg' : `/siteIcons/${name}_icon.svg`) };
}

/** Only catalog matches and approved release pages; never invent links from artist handles. */
export function releaseListeningLinks(item: ArtistLatestItem, artistName: string, sources: ReleaseSource[] = [], profiles: ProfileLink[] = []): ProfileLink[] {
    if (item.kind !== 'release') return [];
    const result: ProfileLink[] = [];
    for (const candidate of [
        ...(item.listeningLinks ?? []).map(link => link.href),
        item.sourceUrl,
        ...sources.filter(source => titleMatches(source.title, item.title, artistName)).map(source => source.url),
    ]) {
        const safe = latestExternalUrl(candidate);
        if (!safe) continue;
        const url = new URL(safe);
        if (url.port) continue;
        const link = releasePlatform(url, profiles);
        if (link && !result.some(existing => existing.siteName === link.siteName)) result.push(link);
    }
    return result;
}
