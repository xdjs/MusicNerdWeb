import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/** File a correction report on the About the reader saw, on MusicNerdAPI with the current Privy token. */
export async function requestBioCorrection(
  artistId: string,
  report: { reason: string; details: string; sourceUrl: string; expectedBio: string },
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to send your suggestion.');
  return fetch(musicNerdApiUrl(`/api/artist/${artistId}/bio-corrections`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    credentials: 'omit',
    cache: 'no-store',
  });
}
