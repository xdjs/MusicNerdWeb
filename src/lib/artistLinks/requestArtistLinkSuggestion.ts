import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { AddArtistDataResp } from './types';

/**
 * Suggest a link for an artist on MusicNerdAPI (`POST /api/artist/{id}/links`) with the current Privy token.
 *
 * @returns The outcome for the add-link dialog; `siteName` is the platform's display name.
 */
export async function requestArtistLinkSuggestion(artistId: string, url: string): Promise<AddArtistDataResp> {
  const token = await getAccessToken();
  if (!token) return { status: 'error', message: 'Please sign in again to add links.' };
  const response = await fetch(musicNerdApiUrl(`/api/artist/${encodeURIComponent(artistId)}/links`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.status !== 'ok') {
    return { status: 'error', message: body?.error ?? 'Error adding artist data, please try again' };
  }
  return { status: 'success', message: body.message, siteName: body.platformName ?? body.siteName };
}
