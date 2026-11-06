import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/**
 * Read the adder's directory discovery status on MusicNerdAPI with the current Privy token.
 *
 * @returns The response, or null when no account is signed in (nothing to observe).
 */
export async function requestDirectoryDiscovery(artistId: string, signal: AbortSignal): Promise<Response | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return fetch(musicNerdApiUrl(`/api/artist/${encodeURIComponent(artistId)}/directory-discovery`), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
}
