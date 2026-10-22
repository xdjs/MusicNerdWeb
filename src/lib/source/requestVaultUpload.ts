import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';

type VaultUploadBody =
  | { artistId: string; name: string; type: string; size: number }
  | { ticket: string };

/** Call MusicNerdAPI's vault upload sign or complete step with current Privy authority, without cookie-route fallback. */
export async function requestVaultUpload(step: 'sign' | 'complete', body: VaultUploadBody): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to upload files.');
  return fetch(musicNerdApiUrl(`/api/vault/upload/${step}`), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
}
