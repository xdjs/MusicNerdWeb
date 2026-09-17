/** @jest-environment node */
import {GET} from '../route';
import {db} from '@/server/db/drizzle';
import {musicPlatformData} from '@/server/utils/musicPlatform';
jest.mock('@/server/db/drizzle',()=>({db:{query:{artists:{findFirst:jest.fn()}}}}));
jest.mock('@/server/utils/musicPlatform',()=>({musicPlatformData:{getArtistImage:jest.fn()}}));
const id='6cb3d81a-3d02-4c57-a711-bb7902a9af1b';
const get=(artistId=id)=>GET(new Request(`https://test/api/artist/${artistId}/image`),{params:Promise.resolve({id:artistId})});
beforeEach(()=>{jest.clearAllMocks();(db.query.artists.findFirst as jest.Mock).mockResolvedValue({id,customImage:null});(musicPlatformData.getArtistImage as jest.Mock).mockResolvedValue('https://cdn.example.com/photo.jpg');});
it('uses the existing provider fallback for artists without uploads',async()=>{const r=await get();expect(r.status).toBe(307);expect(r.headers.get('Location')).toBe('https://cdn.example.com/photo.jpg');expect(r.headers.get('Cache-Control')).toContain('max-age=3600');});
it('prefers a custom upload and avoids provider work',async()=>{(db.query.artists.findFirst as jest.Mock).mockResolvedValue({id,customImage:' /artist-photo.png '});const r=await get();expect(r.headers.get('Location')).toBe('https://test/artist-photo.png');expect(musicPlatformData.getArtistImage).not.toHaveBeenCalled();});
it('rejects invalid IDs before reading the database',async()=>{expect((await get('bad')).status).toBe(400);expect(db.query.artists.findFirst).not.toHaveBeenCalled();});
it('returns a fallback-triggering response for missing artists or photos',async()=>{(db.query.artists.findFirst as jest.Mock).mockResolvedValueOnce(undefined);expect((await get()).status).toBe(404);(musicPlatformData.getArtistImage as jest.Mock).mockResolvedValue(null);expect((await get()).status).toBe(404);});
it('does not cache failures or redirect to unsafe schemes',async()=>{(musicPlatformData.getArtistImage as jest.Mock).mockResolvedValue('javascript:alert(1)');const r=await get();expect(r.status).toBe(404);expect(r.headers.get('Cache-Control')).toBe('no-store');(db.query.artists.findFirst as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));expect((await get()).status).toBe(503);});
it('ignores stored placeholder images when a provider portrait exists',async()=>{for(const customImage of ['/default_pfp_pink.png','/musicNerdLogo.png','/placeholder.png']){(db.query.artists.findFirst as jest.Mock).mockResolvedValue({id,customImage});const r=await get();expect(r.headers.get('Location')).toBe('https://cdn.example.com/photo.jpg');}});

it('falls back to providers when legacy custom URLs are invalid',async()=>{for(const customImage of ['javascript:alert(1)','http://cdn.example.com/photo.jpg','https://[broken','https://user:password@example.com/photo.jpg']){(db.query.artists.findFirst as jest.Mock).mockResolvedValue({id,customImage});const r=await get();expect(r.status).toBe(307);expect(r.headers.get('Location')).toBe('https://cdn.example.com/photo.jpg');}});
