import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

export type MusicNerdApiResult<T> = ({ success: true } & T) | { success: false; error: string };

/**
 * Calls a signed-in MusicNerdAPI route with the current Privy access token and
 * reads its JSON body.
 *
 * @param path - The route, starting with `/`.
 * @param init - The method and an optional JSON body.
 * @returns `{ success: true, ...body }`, or `{ success: false, error }` with the API's message.
 */
export async function requestMusicNerdApi<T = Record<string, unknown>>(
  path: string,
  init: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<MusicNerdApiResult<T>> {
  const token = await getAccessToken().catch(() => null);
  if (!token) return { success: false, error: 'Please sign in again.' };
  const hasBody = init.body !== undefined;
  try {
    const response = await fetch(musicNerdApiUrl(path), {
      method: init.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(hasBody ? { 'Content-Type': 'application/json' } : {}) },
      ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
      credentials: 'omit',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: data?.error ?? 'Please try again.' };
    return { success: true, ...data };
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}
