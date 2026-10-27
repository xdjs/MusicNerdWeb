import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

/** Ask MusicNerdAPI to link a wallet the signed-in Privy user owns, merging a legacy account that has it. */
export async function requestLinkWallet(walletAddress: string | undefined): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to link your wallet.');
  return fetch(musicNerdApiUrl('/api/auth/link-wallet'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
