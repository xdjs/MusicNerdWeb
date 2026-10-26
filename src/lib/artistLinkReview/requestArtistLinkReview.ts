import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { LinkReviewDecision } from './types';

/** Send one link-suggestion decision to MusicNerdAPI with current Privy authority. */
export async function requestArtistLinkReview(artistId: string, decision: LinkReviewDecision): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to review suggested links.');
  return fetch(musicNerdApiUrl(`/api/artist/${encodeURIComponent(artistId)}/link-suggestions`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(decision),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
