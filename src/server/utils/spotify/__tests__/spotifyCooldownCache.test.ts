/** @jest-environment node */
import { getSpotifyArtist, getSpotifyImage, getSpotifyCatalogNames } from '@/server/utils/queries/externalApiQueries';
import { spotifyGet } from '../spotifyGet';
import { SpotifyCooldownError } from '../SpotifyCooldownError';
jest.mock('../spotifyGet', () => ({ spotifyGet: jest.fn() }));
jest.mock('@/env', () => ({ SPOTIFY_WEB_CLIENT_ID: 'client', SPOTIFY_WEB_CLIENT_SECRET: 'secret' }));
jest.mock('next/cache', () => {
 // Exercise Next's actual serialization and success-only cache write path.
 // Only the backing store and provider HTTP are substituted.
 Object.defineProperty(globalThis, 'AsyncLocalStorage', {
  value: jest.requireActual('node:async_hooks').AsyncLocalStorage, configurable: true,
 });
 const entries = new Map<string, unknown>();
 Object.defineProperty(globalThis, '__incrementalCache', { configurable: true, value: {
  generateSimpleCacheKey: async (key: string) => key,
  get: async (key: string) => entries.has(key) ? {value: entries.get(key), isStale:false} : null,
  set: async (key: string, value: unknown) => { entries.set(key,value); },
 }});
 return jest.requireActual('next/dist/server/web/spec-extension/unstable-cache');
});
const headers = { headers: { Authorization: 'Bearer fixture', 'x-token-expiry': String(Date.now() + 3_600_000) } };
afterEach(() => jest.clearAllMocks());
it.each(['artist', 'image', 'catalog'] as const)('retries %s with the same cache arguments after cooldown clears', async kind => {
 const fetchValue = () => kind === 'artist' ? getSpotifyArtist(kind, headers) : kind === 'image' ? getSpotifyImage(kind, 'fixture', headers) : getSpotifyCatalogNames(kind, headers);
 jest.mocked(spotifyGet).mockRejectedValue(new SpotifyCooldownError(Date.now() + 1000));
 await fetchValue().catch(() => undefined);
 jest.mocked(spotifyGet).mockResolvedValue({ data: { id: kind, name: 'Artist', images: [{url:'https://example.com/photo.jpg'}], items: [{name:'Album'}], tracks:[{name:'Song'}] } } as never);
 const callsBefore = jest.mocked(spotifyGet).mock.calls.length;
 const result = await fetchValue();
 expect(jest.mocked(spotifyGet).mock.calls.length).toBeGreaterThan(callsBefore);
 if (kind === 'artist') expect(result).toMatchObject({data:{name:'Artist'}});
 if (kind === 'image') expect(result).toMatchObject({artistImage:'https://example.com/photo.jpg'});
 if (kind === 'catalog') expect(result).toEqual({releases:['Album'],topTracks:['Song']});
});

it('keeps successful catalog results while retrying only the failed endpoint', async () => {
 jest.mocked(spotifyGet).mockImplementation(async url => {
  if (url.includes('/albums')) return {data:{items:[{name:'Album'}]}} as never;
  throw new SpotifyCooldownError(Date.now() + 1000);
 });
 expect(await getSpotifyCatalogNames('partial',headers)).toEqual({releases:['Album'],topTracks:[]});
 jest.mocked(spotifyGet).mockResolvedValue({data:{tracks:[{name:'Recovered song'}]}} as never);
 const calls = jest.mocked(spotifyGet).mock.calls.length;
 expect(await getSpotifyCatalogNames('partial',headers)).toEqual({releases:['Album'],topTracks:['Recovered song']});
 expect(jest.mocked(spotifyGet).mock.calls.length).toBe(calls + 1);
 expect(jest.mocked(spotifyGet).mock.calls.at(-1)?.[0]).toContain('/top-tracks');
});

it('caches legitimate empty catalogs and images after successful provider responses', async () => {
 jest.mocked(spotifyGet).mockResolvedValue({data:{items:[],tracks:[],images:[]}} as never);
 expect(await getSpotifyCatalogNames('empty',headers)).toEqual({releases:[],topTracks:[]});
 expect(await getSpotifyImage('empty','empty',headers)).toEqual({artistImage:'',artistId:'empty'});
 const calls = jest.mocked(spotifyGet).mock.calls.length;
 await getSpotifyCatalogNames('empty',headers);
 await getSpotifyImage('empty','empty',headers);
 expect(jest.mocked(spotifyGet).mock.calls.length).toBe(calls);
});

it.each([new Error('network timeout'), {response:{status:503}}])('does not cache transient non-cooldown failures (%p)', async error => {
 const id = 'error-' + (error instanceof Error ? error.message : error.response.status);
 jest.mocked(spotifyGet).mockRejectedValue(error);
 expect((await getSpotifyArtist(id,headers)).data).toBeNull();
 jest.mocked(spotifyGet).mockResolvedValue({data:{id,name:'Recovered'}} as never);
 expect(await getSpotifyArtist(id,headers)).toMatchObject({data:{name:'Recovered'}});
});
