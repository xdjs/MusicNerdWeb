import type { Artist } from '@/server/db/DbTypes';
import type { ArtistLink } from '@/server/utils/queries/artistQueries';
import { latestExternalUrl } from '@/lib/artist/artistLatest';
import type { ProfileLink, LinkSection } from './artistProfileLinks';

const SUPPORT = new Set(['bandcamp', 'inprocess', 'supercollector', 'subvert']);
const LOCAL_ICONS: Record<string, string> = { bandcamp: '/siteIcons/bandcamp_icon.svg', soundcloud: '/siteIcons/soundcloud_icon.svg', audius: '/siteIcons/audius_icon.svg', youtube: '/siteIcons/youtube_icon.svg', youtubechannel: '/siteIcons/youtube_icon.svg', subvert: '/siteIcons/subvert_icon.jpg', inprocess: '/siteIcons/inprocess_icon.svg' };
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
