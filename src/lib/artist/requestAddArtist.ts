import { getAccessToken } from '@privy-io/react-auth';
import { musicNerdApiUrl } from '@/lib/musicNerdApi/musicNerdApiUrl';
import type { AddArtistOptions, AddArtistResp } from '@/lib/artist/addArtistTypes';
import type { MusicPlatform } from '@/server/utils/musicPlatform/types';

const UNAUTHENTICATED: AddArtistResp = { status: 'error', code: 'UNAUTHENTICATED', message: 'Please log in to add artists' };

/**
 * Add an artist from a Spotify or Deezer id on MusicNerdAPI (`POST /api/artist`) with the current Privy token.
 *
 * @returns The outcome in the shape the add-artist surfaces render; signed out is `UNAUTHENTICATED`.
 */
export async function requestAddArtist(
    platformId: string,
    platform: MusicPlatform = 'spotify',
    options?: AddArtistOptions,
): Promise<AddArtistResp> {
    const token = await getAccessToken();
    if (!token) return UNAUTHENTICATED;
    const response = await fetch(musicNerdApiUrl('/api/artist'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, platform, ...(options?.forceCreate ? { forceCreate: true } : {}) }),
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
    });
    if (response.status === 401) return UNAUTHENTICATED;
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.status !== 'ok') {
        return { status: 'error', message: body?.error ?? 'Something went wrong on our end, please try again' };
    }
    const { status: _status, result, ...rest } = body;
    return { ...rest, status: result === 'created' ? 'success' : result } as AddArtistResp;
}
