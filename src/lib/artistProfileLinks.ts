import type { Artist } from '@/server/db/DbTypes';
import type { ArtistLink } from '@/server/utils/queries/artistQueries';
import { latestExternalUrl } from '@/lib/artistLatest';

export type LinkSection = 'links' | 'support';
export type ArtistLinkOrder = Partial<Record<LinkSection, string[]>>;
export interface ProfileLink {
    siteName: string;
    href: string;
    label: string;
    iconSrc: string;
}
const SUPPORT = new Set(['bandcamp', 'inprocess', 'supercollector', 'subvert']);
const LOCAL_ICONS: Record<string, string> = { bandcamp: '/siteIcons/bandcamp_icon.svg', soundcloud: '/siteIcons/soundcloud_icon.svg', audius: '/siteIcons/audius_icon.svg', youtube: '/siteIcons/youtube_icon.svg', youtubechannel: '/siteIcons/youtube_icon.svg', subvert: '/siteIcons/subvert_icon.jpg', inprocess: '/siteIcons/inprocess_icon.svg' };
const LISTEN = new Set(['spotify', 'deezer', 'applemusic', 'bandcamp', 'subvert', 'soundcloud', 'audius', 'mixcloud', 'youtube', 'youtubechannel', 'supercollector']);

export function orderProfileLinks(links: ProfileLink[], order: string[] = []): ProfileLink[] {
    const ranks = new Map(order.map((name, index) => [name, index]));
    return [...links].sort((a, b) => (ranks.get(a.siteName) ?? order.length) - (ranks.get(b.siteName) ?? order.length));
}

export function getProfileLinks(artist: Pick<Artist, 'spotify' | 'deezer'>, links: ArtistLink[], section: LinkSection): ProfileLink[] {
    const result: ProfileLink[] = [];
    if (section === 'links') {
        if (artist.spotify?.trim()) result.push({ siteName: 'spotify', href: `https://open.spotify.com/artist/${artist.spotify}`, label: 'Spotify', iconSrc: '/siteIcons/spotify_icon.svg' });
        if (artist.deezer?.trim()) result.push({ siteName: 'deezer', href: `https://www.deezer.com/artist/${artist.deezer}`, label: 'Deezer', iconSrc: '/siteIcons/deezer_icon.svg' });
    }
    for (const link of links) {
        if (link.siteName === 'spotify' || link.siteName === 'deezer') continue;
        const support = link.isMonetized || SUPPORT.has(link.siteName);
        const href = latestExternalUrl(link.artistUrl);
        if (href && support === (section === 'support')) result.push({ siteName: link.siteName, href, label: link.cardPlatformName || link.siteName, iconSrc: LOCAL_ICONS[link.siteName] || link.siteImage || '' });
    }
    return result;
}

/** Only saved listening destinations: no catalog search, generated URLs or social links. */
export function getListeningLinks(artist: Pick<Artist, 'spotify' | 'deezer'>, links: ArtistLink[], sources: { type: string | null; url: string }[] = []): ProfileLink[] {
    // In Process is a collection/discovery link, despite its legacy listen tag.
    const listeningNames = new Set(links.filter(link => link.siteName !== 'inprocess' && (LISTEN.has(link.siteName) || link.platformTypeList?.includes('listen'))).map(link => link.siteName));
    listeningNames.add('spotify');
    listeningNames.add('deezer');
    const result = [...getProfileLinks(artist, links, 'links'), ...getProfileLinks(artist, links, 'support')].filter(link => listeningNames.has(link.siteName));
    // Apple Music profiles can currently be filed as approved website sources.
    // Restrict to artist profile URLs; a review linking an album is not a profile.
    for (const source of sources) {
        const href = latestExternalUrl(source.url);
        if (!href || source.type !== 'website') continue;
        const url = new URL(href);
        if (url.hostname === 'music.apple.com' && /^\/(?:[a-z]{2}\/)?artist\//.test(url.pathname) && !result.some(link => link.siteName === 'applemusic')) {
            result.push({ siteName: 'applemusic', href, label: 'Apple Music', iconSrc: 'https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/applemusic.svg' });
        }
    }
    return result;
}
