const MIXED_AUDIO_ROUTES = [
  'discover', 'search', 'stream', 'upload', 'you', 'settings', 'login', 'signup',
  'about', 'terms', 'privacy', 'pages', 'groups', 'tags', 'trending', 'explore',
  'feed', 'charts', 'dashboard',
];

/** Provider routes cannot become music destinations or adopted artist handles. */
export const MUSIC_RESERVED_HANDLES: Record<string, Set<string>> = {
  bandcamp: new Set(['www', 'daily', 'blog', 'help', 'get', 'artists', 'labels', 'design']),
  subvert: new Set([
    'discover', 'blog', 'docs', 'pages', 'login', 'signup', 'settings', 'cart', 'search',
    'api', 'auth', 'author', 'changelog', 'terms-of-use', 'privacy-policy', 'ai-policy',
  ]),
  supercollector: new Set(['artist', 'about', 'login', 'signup', 'privacy', 'terms', 'search', 'api']),
  soundcloud: new Set([
    ...MIXED_AUDIO_ROUTES, 'terms-of-use', 'terms-of-use-purchases', 'privacy-policy', 'cookies-policy',
  ]),
  audius: new Set([...MIXED_AUDIO_ROUTES, 'documents', 'legal']),
  mixcloud: new Set([...MIXED_AUDIO_ROUTES, 'premium', 'pro', 'plans', 'developers', 'select-terms']),
};
