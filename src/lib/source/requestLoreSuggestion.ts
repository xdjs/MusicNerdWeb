import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/** Suggest a web page as a Lore source on MusicNerdAPI with the current Privy token. */
export async function requestLoreSuggestion(artistId: string, url: string): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to suggest a source.');
  return fetch(musicNerdApiUrl(`/api/artist/${artistId}/lore-suggestions`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    credentials: 'omit',
    cache: 'no-store',
  });
}
