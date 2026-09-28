import { generateArtistBio } from './artistBioQuery';
import type { ArtistWriteAuth } from './ownershipWrites';

/** Preserve actionable errors for server-action callers instead of swallowing them. */
export async function regenerateArtistBio(artistId: string, auth?: ArtistWriteAuth): Promise<string | null> {
  const response = await generateArtistBio(artistId, auth);
  const data = await response.json();
  if (response.status >= 400) throw new Error(data.error ?? 'Could not generate About from Lore');
  return data.bio ?? null;
}
