import { createHash } from 'node:crypto';
import { SPOTIFY_WEB_CLIENT_ID } from '@/env';

/** Match the API key derivation; Spotify limits belong to the app, not a token. */
export function spotifyCooldownKey(): string {
  if (!SPOTIFY_WEB_CLIENT_ID) throw new Error('Spotify credentials not configured');
  return `spotify:${createHash('sha256').update(SPOTIFY_WEB_CLIENT_ID).digest('hex')}`;
}
