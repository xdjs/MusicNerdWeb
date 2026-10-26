import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

type UserApiInit = Omit<RequestInit, 'headers' | 'credentials' | 'cache'> & { headers?: Record<string, string> };

/**
 * Call a MusicNerdAPI user or profile route with the Privy token as
 * `Authorization: Bearer` when signed in, never Web's session cookie.
 *
 * @param path - The API route, starting with `/api/`.
 * @param init - Method, body, signal and extra headers.
 * @returns The API response, unchanged.
 */
export async function requestUserApi(path: string, init: UserApiInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(musicNerdApiUrl(path), {
    ...init,
    headers: { ...init.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'omit',
    cache: 'no-store',
  });
}
