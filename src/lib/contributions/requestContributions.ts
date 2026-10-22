import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/**
 * GET one of the viewer's contribution feeds or counts from MusicNerdAPI
 * (`selfEdits`, `ugcCount`, `userEntries`, `recentEdited`). The Privy token
 * is sent when there is one; without it the API answers as signed out.
 *
 * @param path - The API route with its query, starting with `/api/`.
 * @param signal - Aborts the request.
 * @returns The API response.
 */
export async function requestContributions(path: string, signal?: AbortSignal): Promise<Response> {
  const token = await getAccessToken();
  return fetch(musicNerdApiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });
}
