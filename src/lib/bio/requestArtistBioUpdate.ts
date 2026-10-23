import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/** Save the About the editor wrote, or regenerate it from Lore, on MusicNerdAPI with the current Privy token. */
export async function requestArtistBioUpdate(
  artistId: string,
  body: { bio: string } | { regenerate: true },
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to edit the About.');
  return fetch(musicNerdApiUrl(`/api/artistBio/${artistId}`), {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
}
