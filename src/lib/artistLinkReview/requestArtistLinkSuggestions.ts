import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/** Load one page of an artist's link suggestions from MusicNerdAPI with current Privy authority. */
export async function requestArtistLinkSuggestions(artistId: string, offset: number, signal?: AbortSignal): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to review suggested links.');
  const path = `/api/artist/${encodeURIComponent(artistId)}/link-suggestions${offset ? `?offset=${offset}` : ''}`;
  return fetch(musicNerdApiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    signal,
  });
}
