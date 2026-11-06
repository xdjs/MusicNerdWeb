import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { LinkSection } from '@/lib/artist/artistProfileLinks';

/** Save the order of one link section on MusicNerdAPI with current Privy authority. */
export async function requestArtistLinkOrder(body: { artistId: string; section: LinkSection; order: string[] }): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to reorder artist links.');
  return fetch(musicNerdApiUrl('/api/artist/link-order'), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
