import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/**
 * Call an admin endpoint on MusicNerdAPI with the signed-in admin's Privy token,
 * without cookies and without a fallback to a Web route.
 *
 * @param path - The API route, starting with `/api/`.
 * @param options - The method and an optional JSON body.
 * @returns The API response, unread, for the caller to interpret.
 */
export async function requestAdminApi(
  path: string,
  { method, body }: { method?: 'POST' | 'PUT' | 'PATCH'; body?: unknown } = {},
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to use the admin.');
  return fetch(musicNerdApiUrl(path), {
    ...(method ? { method } : {}),
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
