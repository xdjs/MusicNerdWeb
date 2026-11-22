/**
 * Whether a path is one of the OAuth pages an agent sends a member to, which
 * use their own slim header instead of the site's nav and footer.
 *
 * @param pathname - The current path.
 * @returns True under `/oauth/`.
 */
export function isOAuthPage(pathname: string | null): boolean {
  return !!pathname?.startsWith('/oauth/');
}
