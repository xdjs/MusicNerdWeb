type Platform = 'instagram' | 'tiktok' | 'x' | 'inprocess' | 'spotify' | 'deezer';
/** Extract explicit source constraints; a model may interpret intent but cannot replace these. */
export function getExplicitResearchPlatforms(question: string): Platform[] {
  const found = new Set<Platform>();
  const hosts: Record<string, Platform> = {
    'instagram.com': 'instagram', 'tiktok.com': 'tiktok',
    'x.com': 'x', 'twitter.com': 'x', 'inprocess.world': 'inprocess',
    'spotify.com': 'spotify', 'deezer.com': 'deezer',
  };
  const prose = question.replace(/https?:\/\/[^\s<>"']+/gi, value => {
    try {
      const host = new URL(value).hostname.toLowerCase();
      for (const [root, platform] of Object.entries(hosts))
        if (host === root || host.endsWith(`.${root}`)) found.add(platform);
    } catch { /* Invalid URLs are not source identity. */ }
    return ' ';
  });
  const names: [Platform, RegExp][] = [
    ['instagram', /\binstagram\b|\bon\s+ig\b/i],
    ['tiktok', /\btik\s?tok\b/i],
    ['x', /\btwitter\b|\b(?:on|from|via)\s+x\b|\bx\.com\b/i],
    ['inprocess', /\bin-?process\b|\b(?:on|from|via)\s+in\s+process\b/i],
    ['spotify', /\bspotify\b/i], ['deezer', /\bdeezer\b/i],
  ];
  for (const [platform, pattern] of names) if (pattern.test(prose)) found.add(platform);
  if (/\bIn Process\b/.test(prose)) found.add('inprocess');
  return [...found];
}
