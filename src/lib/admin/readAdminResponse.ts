/**
 * Read a MusicNerdAPI admin response, throwing its `error` message when it failed.
 *
 * @param response - The API response.
 * @param fallback - The message when the response carries none.
 * @returns The parsed JSON body of a successful response.
 */
export async function readAdminResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || fallback);
  return body as T;
}
