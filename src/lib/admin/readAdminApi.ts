import { requestAdminApi } from '@/lib/admin/requestAdminApi';

/**
 * GET an admin endpoint on MusicNerdAPI with the signed-in admin's Privy token.
 *
 * @param path - The API route, starting with `/api/`, with its query string.
 * @returns The JSON body.
 * @throws An error carrying the response `status` when the read fails.
 */
export async function readAdminApi<T>(path: string): Promise<T> {
  const response = await requestAdminApi(path);
  if (!response.ok) throw Object.assign(new Error(`Could not load ${path} (${response.status})`), { status: response.status });
  return (await response.json()) as T;
}
