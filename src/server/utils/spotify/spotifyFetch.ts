import { runSpotifyRequest } from './runSpotifyRequest';

/** Native-fetch Spotify reads use the same shared guard as axios reads. */
export function spotifyFetch(url: string, init?: RequestInit): Promise<Response> {
  if (new URL(url).origin !== 'https://api.spotify.com') throw new Error('Invalid Spotify API host');
  return runSpotifyRequest(async () => {
    const response = await fetch(url, init);
    if (response.status === 429) throw { response: { status: 429, headers: { 'retry-after': response.headers.get('retry-after') } } };
    return response;
  });
}
