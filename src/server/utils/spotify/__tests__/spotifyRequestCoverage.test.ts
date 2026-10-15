/** @jest-environment node */
import axios from 'axios';
import { db } from '@/server/db/drizzle';
import { getSpotifyArtist, getSpotifyArtists, getSpotifyImage, getSpotifyCatalogDetail, refreshSpotifyToken } from '@/server/utils/queries/externalApiQueries';
import { spotifyFetch } from '../spotifyFetch';
import { SpotifyProvider } from '@/server/utils/musicPlatform/spotifyProvider';
jest.mock('axios');
jest.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
jest.mock('@/env', () => ({ SPOTIFY_WEB_CLIENT_ID: 'client', SPOTIFY_WEB_CLIENT_SECRET: 'secret' }));
const headers = { headers: { Authorization: 'Bearer fixture', 'x-token-expiry': String(Date.now() + 3_600_000) } };
beforeEach(() => {
 jest.clearAllMocks();
 (db.execute as jest.Mock).mockResolvedValue([{ blocked_until: new Date(Date.now() + 60_000).toISOString() }]);
 global.fetch = jest.fn();
});
it('cached-token artist, batch, image and catalog reads do not bypass a known cooldown', async () => {
 expect((await getSpotifyArtist('fixture', headers)).data).toBeNull();
 await expect(getSpotifyArtists(['fixture'], headers)).rejects.toMatchObject({ response: { status: 429 } });
 expect((await getSpotifyImage('fixture','artist',headers)).artistImage).toBe('');
 expect(await getSpotifyCatalogDetail('fixture', headers)).toEqual([]);
 expect(axios.get).not.toHaveBeenCalled();
});
it('token refresh, provider search and native ISRC reads do not bypass a known cooldown', async () => {
 await expect(refreshSpotifyToken()).rejects.toMatchObject({ response: { status: 429 } });
 expect(await new SpotifyProvider().searchArtists('The Ellis Court', 5)).toEqual([]);
 await expect(spotifyFetch('https://api.spotify.com/v1/search?q=isrc:EXAMPLE')).rejects.toMatchObject({ response: { status: 429 } });
 expect(axios.get).not.toHaveBeenCalled();
 expect(axios.post).not.toHaveBeenCalled();
 expect(fetch).not.toHaveBeenCalled();
});
