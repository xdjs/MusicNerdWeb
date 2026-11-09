import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { ArtistVaultSource } from '@/server/db/DbTypes';

export type ArtistSourcesResult = { success: boolean; error?: string; source?: ArtistVaultSource; warning?: string; count?: number };

/**
 * Add, update or remove an artist's sources on MusicNerdAPI with the current Privy token.
 * `sourceId` targets one source; without it the call is on the artist's sources.
 *
 * @returns `success` plus the API's `source`, `warning` and `count`, or its `error`.
 */
export async function requestArtistSources(
  artistId: string,
  { method, sourceId, body }: { method: 'POST' | 'PATCH' | 'DELETE'; sourceId?: string; body?: unknown },
): Promise<ArtistSourcesResult> {
  try {
    const token = await getAccessToken();
    if (!token) return { success: false, error: 'Please sign in again.' };
    const path = `/api/artist/${artistId}/knowledge/sources${sourceId ? `/${sourceId}` : ''}`;
    const response = await fetch(musicNerdApiUrl(path), {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: json.error ?? 'Please try again' };
    return { success: true, source: json.source, warning: json.warning, count: json.count };
  } catch {
    return { success: false, error: 'Please try again' };
  }
}
