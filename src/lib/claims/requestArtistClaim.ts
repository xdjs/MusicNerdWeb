import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

export type ArtistClaimResult = { success: boolean; error?: string; alreadyClaimed?: boolean; referenceCode?: string };

/**
 * Claim an artist profile for the signed-in user on MusicNerdAPI with their
 * Privy token, without cookies.
 *
 * @param artistId - The artist to claim.
 * @returns The reference code on success; whether the profile was already claimed; or the error to show.
 */
export async function requestArtistClaim(artistId: string): Promise<ArtistClaimResult> {
  const token = await getAccessToken();
  if (!token) return { success: false, error: 'Please sign in again to claim this profile.' };
  const response = await fetch(musicNerdApiUrl(`/api/artist/${encodeURIComponent(artistId)}/claim`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
  const body = (await response.json().catch(() => ({}))) as { referenceCode?: string; error?: string };
  if (response.ok && body.referenceCode) return { success: true, referenceCode: body.referenceCode };
  if (response.status === 409) return { success: false, alreadyClaimed: true, error: body.error };
  return { success: false, error: body.error };
}
