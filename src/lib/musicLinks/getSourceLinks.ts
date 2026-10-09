import type { ProfileLink, LinkSection } from '@/lib/artist/artistProfileLinks';
import { normalizePublicUrl } from '@/lib/links/normalizePublicUrl';
import { isDestinationSource } from './isDestinationSource';
import { parseMusicDestination } from './parseMusicDestination';

const MUSIC_ICONS: Record<string, string> = {
  apple_music: '/siteIcons/applemusic_icon.svg', beatport: '/siteIcons/beatport_icon.svg',
  spotify: '/siteIcons/spotify_icon.svg', deezer: '/siteIcons/deezer_icon.svg',
  bandcamp: '/siteIcons/bandcamp_icon.svg', soundcloud: '/siteIcons/soundcloud_icon.svg',
  audius: '/siteIcons/audius_icon.svg',
  subvert: '/siteIcons/subvert_icon.jpg',
};

/** Approved source records retain their review/provenance while displaying as destinations. */
export function getSourceLinks(
  sources: { id: string; url: string; type?: string | null; title?: string | null; podcastEpisodeKey?: string | null; status?: string }[],
  existingLinks: ProfileLink[] = [],
  section: LinkSection = 'links',
): (ProfileLink & { sourceId: string; kind: 'artist' | 'release' | 'website' })[] {
  const result: (ProfileLink & { sourceId: string; kind: 'artist' | 'release' | 'website' })[] = [];
  const seen = new Set(existingLinks.map(link => link.siteName === 'applemusic' ? 'apple_music' : link.siteName));
  const urls = new Set(existingLinks.map(link => link.href));
  // Explicit website destinations predate URL-based routing and remain preferred.
  const ordered = [...sources].sort((a, b) => Number(b.type === 'website') - Number(a.type === 'website'));
  for (const source of ordered) {
    const href = normalizePublicUrl(source.url);
    if (!href || !isDestinationSource(source) || (source.status && source.status !== 'approved')) continue;
    const destination = parseMusicDestination(href);
    if (!destination && source.type !== 'website') continue;
    if ((destination?.support ?? false) !== (section === 'support')) continue;
    if (urls.has(href)) continue;
    if (destination?.kind === 'artist' && seen.has(destination.platform)) continue;
    const label = destination
      ? destination.kind === 'release' && source.title?.trim()
        ? `${source.title.trim()} · ${destination.label}`
        : destination.label
      : new URL(href).hostname.replace(/^www\./, '');
    const siteName = destination?.kind === 'artist' ? destination.platform === 'apple_music' ? 'applemusic' : destination.platform : `source:${source.id}`;
    result.push({ siteName, href, label, iconSrc: destination ? MUSIC_ICONS[destination.platform] ?? '/siteIcons/music_icon.svg' : '', sourceId: source.id, kind: destination?.kind ?? 'website' });
    if (destination?.kind === 'artist') seen.add(destination.platform);
    urls.add(href);
  }
  return result;
}
