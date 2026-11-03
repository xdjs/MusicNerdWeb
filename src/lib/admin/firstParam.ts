/** A page's search parameters as Next.js passes them. */
export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * The first value of a search parameter.
 *
 * @param value - The parameter as Next.js passes it.
 * @returns Its first value, or an empty string.
 */
export function firstParam(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : value?.[0] ?? '';
}
