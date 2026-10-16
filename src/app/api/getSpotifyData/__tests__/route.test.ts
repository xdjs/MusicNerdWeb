/** @jest-environment node */
import { GET } from '../route';
import { getSpotifyHeaders, getSpotifyArtist } from '@/server/utils/queries/externalApiQueries';
import { SpotifyCooldownError } from '@/server/utils/spotify/SpotifyCooldownError';
jest.mock('@/server/utils/queries/artistQueries', () => ({}));
jest.mock('@/server/utils/queries/externalApiQueries', () => ({getSpotifyHeaders:jest.fn(),getSpotifyArtist:jest.fn(),getSpotifyArtists:jest.fn()}));
if (typeof Response.json !== 'function') {
 Response.json = (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), {
  ...init, headers: { 'Content-Type': 'application/json', ...init?.headers },
 });
}
it('returns a retryable response when token acquisition is blocked, then recovers',async()=>{
 jest.mocked(getSpotifyHeaders).mockRejectedValueOnce(new SpotifyCooldownError(Date.now()+60_000));
 const response=await GET(new Request('http://localhost/api/getSpotifyData?spotifyId=fixture'));
 expect(response.status).toBe(503);
 expect(response.headers.get('retry-after')).toMatch(/^\d+$/);
 expect(response.headers.get('cache-control')).toBe('no-store');
 expect(await response.json()).toEqual({error:'Spotify is temporarily rate limited. Please try again later.'});
 expect(getSpotifyArtist).not.toHaveBeenCalled();
 jest.mocked(getSpotifyHeaders).mockResolvedValueOnce({headers:{Authorization:'Bearer fixture'}});
 jest.mocked(getSpotifyArtist).mockResolvedValueOnce({data:{id:'fixture',name:'Recovered'} as never,error:null});
 const recovered=await GET(new Request('http://localhost/api/getSpotifyData?spotifyId=fixture'));
 expect(recovered.status).toBe(200);
 expect(await recovered.json()).toMatchObject({data:{name:'Recovered'}});
});
