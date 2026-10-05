import type { Artist } from '@/server/db/DbTypes';
import type { ArtistLink } from '@/server/utils/queries/artistQueries';
import type { ProfileLink } from './artistProfileLinks';
import { getProfileLinks } from './getProfileLinks';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';

const LISTEN = new Set(['spotify', 'deezer', 'applemusic', 'bandcamp', 'subvert', 'soundcloud', 'audius', 'mixcloud', 'youtube', 'youtubechannel', 'supercollector']);

/** Only saved listening destinations: no catalog search, generated URLs or social links. */
export function getListeningLinks(artist: Pick<Artist, 'spotify' | 'deezer'>, links: ArtistLink[], sources: { id?: string; type: string | null; url: string; title?: string | null; podcastEpisodeKey?: string | null }[] = []): ProfileLink[] {
    // In Process is a collection/discovery link, despite its legacy listen tag.
    const listeningNames = new Set(links.filter(link => link.siteName !== 'inprocess' && (LISTEN.has(link.siteName) || link.platformTypeList?.includes('listen'))).map(link => link.siteName));
    listeningNames.add('spotify');
    listeningNames.add('deezer');
    const result = [...getProfileLinks(artist, links, 'links'), ...getProfileLinks(artist, links, 'support')].filter(link => listeningNames.has(link.siteName));
    const sourceLinks = getSourceLinks(sources.map(source => ({ ...source, id: source.id ?? source.url })), result);
    const supportLinks = getSourceLinks(sources.map(source => ({ ...source, id: source.id ?? source.url })), result, 'support');
    result.push(...[...sourceLinks, ...supportLinks].filter(link => link.kind === 'artist'));
    return result;
}
