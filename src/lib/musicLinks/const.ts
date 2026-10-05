const MIXED_AUDIO_ROUTES = [
  'discover', 'search', 'stream', 'upload', 'you', 'settings', 'login', 'signup',
  'about', 'terms', 'privacy', 'pages', 'groups', 'tags', 'trending', 'explore',
  'feed', 'charts', 'dashboard',
];

/** Provider routes cannot become music destinations or adopted artist handles. */
export const MUSIC_RESERVED_HANDLES: Record<string, Set<string>> = {
  bandcamp: new Set(['www', 'daily', 'blog', 'help', 'support', 'store', 'get', 'artists', 'labels', 'design']),
  subvert: new Set([
    'discover', 'blog', 'docs', 'pages', 'login', 'signup', 'settings', 'cart', 'search',
    'api', 'auth', 'author', 'changelog', 'terms-of-use', 'privacy-policy', 'ai-policy',
  ]),
  supercollector: new Set(['artist', 'artists', 'create', 'about', 'login', 'signup', 'privacy', 'terms', 'search', 'api']),
  soundcloud: new Set([
    ...MIXED_AUDIO_ROUTES, 'terms-of-use', 'terms-of-use-purchases', 'privacy-policy', 'cookies-policy',
    'imprint', 'company', 'getstarted', 'stories', 'playbook-articles', 'community-guidelines',
    'popular', 'topic', 'n', 'go-terms-of-use', 'terms-of-use-pro', 'terms-of-use-new',
  ]),
  audius: new Set([
    ...MIXED_AUDIO_ROUTES, 'documents', 'legal', '404', 'app-redirect', 'audio', 'auth-redirect',
    'cash', 'check', 'clubs', 'coins', 'contests', 'deactivate', 'dev-tools', 'download',
    'empty_page', 'favorites', 'favoriting_users', 'followers', 'following', 'history',
    'host-contest', 'join', 'leaderboard', 'library', 'messages', 'notification', 'notifications',
    'oauth', 'payments', 'playlists', 'press', 'register', 'reposting_users', 'rewards',
    'signin', 'signon', 'tracks', 'users', 'verify-email', 'wallet',
  ]),
  mixcloud: new Set([
    ...MIXED_AUDIO_ROUTES, 'premium', 'pro', 'plans', 'developers', 'select-terms',
    'jobs', 'blog', 'community', 'genres', 'live',
  ]),
};
