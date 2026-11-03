/**
 * A path with its non-empty parameters as the query string.
 *
 * @param path - The route.
 * @param params - Parameter values; empty strings are left out.
 * @returns The path, with `?query` when any parameter is set.
 */
export function withQuery(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== ''));
  return query.size ? `${path}?${query}` : path;
}
