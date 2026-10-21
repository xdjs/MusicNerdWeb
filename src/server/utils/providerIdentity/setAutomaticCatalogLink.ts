import { getArtistById } from '@/server/utils/queries/artistQueries';
import { setArtistLink } from '@/server/utils/artistLinkService';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
import { hasVerifiedDeezerPair } from './hasVerifiedDeezerPair';
import type { CatalogWriteEvidence } from './types';

/** Automatic DSP discoveries require reciprocal evidence; manual edits use the shared writer directly. */
export async function setAutomaticCatalogLink(artistId: string, platform: 'spotify' | 'deezer', value: string): Promise<void> {
  const artist = await getArtistById(artistId);
  if (!artist || (artist[platform] && artist[platform] !== value))
    throw new ArtistLinkConflictError('Automatic discovery cannot replace an existing catalog identity');
  const spotifyId = platform === 'spotify' ? value : artist.spotify;
  const deezerId = platform === 'deezer' ? value : artist.deezer;
  if (!deezerId || !(await hasVerifiedDeezerPair(spotifyId, deezerId)))
    throw new ArtistLinkConflictError('Automatic catalog identity lacks reciprocal evidence');
  const evidence: CatalogWriteEvidence = platform === 'deezer'
    ? { spotifyId: spotifyId!, deezerId, previousDeezerId: artist.deezer ?? null }
    : { spotifyId: spotifyId!, deezerId, previousSpotifyId: artist.spotify ?? null };
  await setArtistLink(artistId, platform, value, undefined, undefined, evidence);
}
