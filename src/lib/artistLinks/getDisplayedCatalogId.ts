import { parseMusicDestination } from '@/lib/musicLinks/parseMusicDestination';

/** The identity the user actually saw; malformed catalog links must never clear an unseen replacement. */
export function getDisplayedCatalogId(siteName: string, href: string): string | undefined {
  if (siteName !== 'spotify' && siteName !== 'deezer') return undefined;
  const destination = parseMusicDestination(href);
  if (destination?.kind !== 'artist' || destination.platform !== siteName) {
    throw new Error('Reload the artist profile before removing this catalog link.');
  }
  return destination.id;
}
