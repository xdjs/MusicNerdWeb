import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { runSpotifyRequest } from './runSpotifyRequest';

/** All authenticated Spotify GETs share the durable app-level cooldown. */
export function spotifyGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'api.spotify.com') throw new Error('Invalid Spotify API host');
  return runSpotifyRequest(() => axios.get<T>(url, { timeout: 5000, ...config }));
}
