import type { MusicDestination } from './types';

/** Recognize catalog destinations, not artist identity or editorial/podcast pages. */
export function parseMusicDestination(raw: string): MusicDestination | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  let match: RegExpMatchArray | null;
  let platform: string;
  let label: string;
  let kind: 'artist' | 'release';
  let id: string;
  if (['music.apple.com', 'itunes.apple.com'].includes(host)) {
    match = path.match(/^\/(?:[a-z]{2}\/)?(artist|album|song)\/(?:[^/]+\/)?(?:id)?([1-9]\d*)$/i);
    if (!match) return null;
    [platform, label, kind, id] = ['apple_music', 'Apple Music', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (host === 'beatport.com') {
    match = path.match(/^\/(?:[a-z]{2}\/)?(artist|release|track)\/[^/]+\/([1-9]\d*)(?:\/(tracks|releases))?$/i);
    if (!match || (match[3] && match[1] !== 'artist')) return null;
    [platform, label, kind, id] = ['beatport', 'Beatport', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (host === 'open.spotify.com') {
    match = path.match(/^\/(?:intl-[a-z]{2}\/)?(artist|album|track)\/([a-zA-Z0-9]{22})$/);
    if (!match) return null;
    [platform, label, kind, id] = ['spotify', 'Spotify', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (host === 'deezer.com') {
    match = path.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(artist|album|track)\/([1-9]\d*)$/i);
    if (!match) return null;
    [platform, label, kind, id] = ['deezer', 'Deezer', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (['tidal.com', 'listen.tidal.com'].includes(host)) {
    match = path.match(/^\/(?:browse\/)?(artist|album|track)\/([1-9]\d*)$/i);
    if (!match) return null;
    [platform, label, kind, id] = ['tidal', 'Tidal', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (host === 'open.qobuz.com' || host === 'play.qobuz.com') {
    match = path.match(/^\/(artist|album|track)\/([a-zA-Z0-9]+)$/);
    if (!match) return null;
    [platform, label, kind, id] = ['qobuz', 'Qobuz', match[1] === 'artist' ? 'artist' : 'release', match[2]];
  } else if (host === 'qobuz.com') {
    match = path.match(/^\/[a-z]{2}-[a-z]{2}\/(interpreter|album)\/[^/]+\/([a-zA-Z0-9]+)$/i);
    if (!match) return null;
    [platform, label, kind, id] = ['qobuz', 'Qobuz', match[1] === 'interpreter' ? 'artist' : 'release', match[2]];
  } else if (/^music\.amazon\.(com|co\.uk|de|fr|it|es|co\.jp|com\.au|ca|com\.br|in)$/.test(host)) {
    match = path.match(/^\/(artists|albums|tracks)\/([a-zA-Z0-9]{10})(?:\/[^/]+)?$/);
    if (!match) return null;
    [platform, label, kind, id] = ['amazon_music', 'Amazon Music', match[1] === 'artists' ? 'artist' : 'release', match[2]];
  } else if (/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.bandcamp\.com$/.test(host)) {
    const handle = host.split('.')[0];
    if (['www', 'daily', 'blog', 'help', 'get', 'artists', 'labels', 'design'].includes(handle)) return null;
    const profile = path === '/' || path === '/music';
    if (!profile && !/^\/(album|track)\/[^/]+$/.test(path)) return null;
    [platform, label, kind, id] = ['bandcamp', 'Bandcamp', profile ? 'artist' : 'release', profile ? handle : `${handle}${path}`];
  } else if (host === 'subvert.fm') {
    match = path.match(/^\/([a-z0-9][a-z0-9-]*)(?:\/(?:tracks\/)?([a-z0-9][a-z0-9-]*))?$/i);
    if (!match || ['discover', 'blog', 'docs', 'pages', 'login', 'signup', 'settings', 'cart', 'search', 'api', 'auth'].includes(match[1].toLowerCase())) return null;
    if (match[2] && ['tracks', 'releases', 'albums', 'settings', 'followers', 'following', 'collection'].includes(match[2].toLowerCase())) return null;
    [platform, label, kind, id] = ['subvert', 'Subvert', match[2] ? 'release' : 'artist', path.slice(1).toLowerCase()];
  } else if (host === 'release.supercollector.xyz') {
    match = path.match(/^\/(artist\/)?([a-z0-9][a-z0-9-]*)$/i);
    if (!match || ['artist', 'about', 'login', 'signup', 'privacy', 'terms', 'search', 'api'].includes(match[2].toLowerCase())) return null;
    [platform, label, kind, id] = ['supercollector', 'Supercollector', match[1] ? 'artist' : 'release', match[2].toLowerCase()];
  } else if (['soundcloud.com', 'audius.co', 'mixcloud.com'].includes(host)) {
    // These services also host spoken interviews. Source metadata retains that
    // distinction; this parser only identifies profile/release URL shapes.
    match = path.match(/^\/([a-z0-9_-]+)(?:\/(?:((?:sets|album))\/)?([^/]+))?$/i);
    if (!match || ['discover', 'search', 'stream', 'upload', 'you', 'settings', 'login', 'signup', 'about', 'terms', 'privacy', 'pages', 'groups', 'tags', 'trending', 'explore', 'feed', 'charts', 'dashboard'].includes(match[1].toLowerCase())) return null;
    if (match[2] && !((host === 'soundcloud.com' && match[2] === 'sets') || (host === 'audius.co' && match[2] === 'album'))) return null;
    if (match[3] && ['likes', 'reposts', 'tracks', 'albums', 'sets', 'album', 'playlist', 'playlists', 'favorites', 'followers', 'following', 'uploads', 'collection', 'history', 'live', 'posts', 'comments', 'recommended', 'events', 'stories', 'stream'].includes(match[3].toLowerCase())) return null;
    platform = host === 'soundcloud.com' ? 'soundcloud' : host === 'audius.co' ? 'audius' : 'mixcloud';
    label = platform === 'soundcloud' ? 'SoundCloud' : platform === 'audius' ? 'Audius' : 'Mixcloud';
    kind = match[3] ? 'release' : 'artist';
    id = path.slice(1).toLowerCase();
  } else {
    return null;
  }
  return { platform, label, kind, id, url: raw, support: ['bandcamp', 'subvert', 'supercollector'].includes(platform) };
}
