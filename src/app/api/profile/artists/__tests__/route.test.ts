/** @jest-environment node */
import { GET } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { getContributedArtists } from '@/server/utils/profile/getContributedArtists';
jest.mock('@/lib/auth-helpers',()=>({requireAuth:jest.fn()}));
jest.mock('@/server/utils/profile/getContributedArtists',()=>({getContributedArtists:jest.fn()}));
if(typeof Response.json!=='function') Response.json=(data,init)=>new Response(JSON.stringify(data),init);
const req=(query='',account='a')=>new Request(`https://test/api/profile/artists${query}`,{headers:{'X-Profile-Account':account}});
beforeEach(()=>{jest.clearAllMocks();jest.mocked(requireAuth).mockResolvedValue({authenticated:true,userId:'a',session:{user:{id:'a'},expires:'2099-01-01'}});(getContributedArtists as jest.Mock).mockResolvedValue({artists:[{id:'artist',name:'Artist',customImage:null}],total:25});});
it('returns only display fields and a bounded next page for the authenticated account',async()=>{
 const r=await GET(req('?userId=b&q=Artist'));expect(r.status).toBe(200);
 expect(getContributedArtists).toHaveBeenCalledWith('a',{offset:0,limit:24,query:'Artist'});
 expect(await r.json()).toEqual({userId:'a',artists:[{artistId:'artist',artistName:'Artist',imageUrl:null}],total:25,next:1});
 expect(r.headers.get('Cache-Control')).toBe('private, no-store');
});
it('denies anonymous and switched-account reads',async()=>{
 expect((await GET(req('','b'))).status).toBe(409);
 jest.mocked(requireAuth).mockResolvedValue({authenticated:false,response:new Response(null,{status:401})});
 expect((await GET(req())).status).toBe(401);expect(getContributedArtists).not.toHaveBeenCalled();
});
it.each(['?offset=-1','?offset=2.2','?offset=1000000',`?q=${'x'.repeat(201)}`])('rejects invalid pagination/search %s',async q=>{expect((await GET(req(q))).status).toBe(400);expect(getContributedArtists).not.toHaveBeenCalled()});
it('does not substitute sample artists for database failures',async()=>{(getContributedArtists as jest.Mock).mockRejectedValue(new Error('db'));expect((await GET(req())).status).toBe(503)});
it.each(['http://example.com/photo.jpg','//example.com/photo.jpg','https://user:password@example.com/photo.jpg','https://[broken','garbage','/default_pfp_pink.png'])('removes unsafe or placeholder stored image %s',async customImage=>{
 (getContributedArtists as jest.Mock).mockResolvedValue({artists:[{id:'artist',name:'Artist',customImage}],total:1});
 expect((await (await GET(req())).json()).artists[0].imageUrl).toBeNull();
});
it.each(['/images/portrait.png','https://example.com/portrait.png'])('preserves a valid stored image %s',async customImage=>{
 (getContributedArtists as jest.Mock).mockResolvedValue({artists:[{id:'artist',name:'Artist',customImage}],total:1});
 expect((await (await GET(req())).json()).artists[0].imageUrl).toBe(customImage);
});
