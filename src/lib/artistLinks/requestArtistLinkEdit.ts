import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { ArtistLinkEditBody } from './types';

/** Call the two migrated link-edit endpoints with current Privy authority, without cookie-route fallback. */
export async function requestArtistLinkEdit(
  endpoint: 'directEditLink' | 'removeArtistData',
  body: ArtistLinkEditBody,
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to edit artist links.');
  return fetch(musicNerdApiUrl(`/api/${endpoint}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
