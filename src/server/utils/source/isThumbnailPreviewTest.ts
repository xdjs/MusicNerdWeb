/** Temporary #1583 preview experiment. Remove with its config before merge.
 * Only suppresses paid Lore scheduling; never authorizes a source mutation.
 * Cleanup keeps suppression after expiry so removing a test cannot start AI.
 */
export function isThumbnailPreviewTest(artistId: string, url: string | null | undefined, cleanup = false): boolean {
  if (process.env.VERCEL_ENV !== 'preview'
    || process.env.VERCEL_GIT_COMMIT_REF !== 'codex/1583-suggestion-routing'
    || !url) return false;
  try {
    const scope = JSON.parse(process.env.MN_THUMBNAIL_TEST_SCOPE ?? '') as { artistId?: string; url?: string; expiresAt?: number };
    const remaining = typeof scope.expiresAt === 'number' ? scope.expiresAt - Date.now() : NaN;
    return scope.artistId === artistId && scope.url === url
      && Number.isFinite(remaining) && remaining <= 24 * 60 * 60 * 1000
      && (cleanup || remaining > 0);
  } catch { return false; }
}
