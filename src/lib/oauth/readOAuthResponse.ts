/**
 * Read a MusicNerdAPI OAuth response: the JSON body when it succeeded, or an
 * Error carrying the API's `error` message when it did not.
 *
 * @param response - The response from an `/api/oauth/*` route.
 * @returns The parsed body.
 */
export async function readOAuthResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || 'Something went wrong. Please try again.');
  return body as T;
}
