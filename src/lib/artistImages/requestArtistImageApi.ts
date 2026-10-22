import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

type ArtistImagePath = `/api/artist/${'photo-choice' | 'profile-image' | 'header-position'}${string}`;
type ArtistImageInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

/** Call a MusicNerdAPI artist-image endpoint with current Privy authority, without cookie-route fallback. */
export async function requestArtistImageApi(path: ArtistImagePath, init: ArtistImageInit): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to change the photo.');
  return fetch(musicNerdApiUrl(path), {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
