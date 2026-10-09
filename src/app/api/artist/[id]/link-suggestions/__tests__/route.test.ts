/** @jest-environment node */
import { GET,POST } from '../route';
import { requireAuth } from '@/lib/auth-helpers';
import { getArtistLinkSuggestions } from '@/server/utils/artistLinkReview/getArtistLinkSuggestions';
import { reviewArtistLinkSuggestion } from '@/server/utils/artistLinkReview/reviewArtistLinkSuggestion';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
jest.mock('@/lib/auth-helpers');
jest.mock('@/server/utils/artistLinkReview/getArtistLinkSuggestions');
jest.mock('@/server/utils/artistLinkReview/reviewArtistLinkSuggestion');
jest.mock('@/server/utils/queries/ownershipWrites',()=>({OwnershipChangedError:class extends Error{}}));
if (typeof Response.json !== 'function') Response.json=(data:unknown,init?:ResponseInit)=>new Response(JSON.stringify(data),init);
const id='00000000-0000-4000-8000-000000000001';
const params={params:Promise.resolve({id})};
const request=(body:unknown)=>new Request('https://example.test/api/link-suggestions',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{jest.resetAllMocks();jest.mocked(requireAuth).mockResolvedValue({authenticated:true,userId:id,session:{user:{id}}} as never);});
it('rejects anonymous reads and writes before access',async()=>{
 jest.mocked(requireAuth).mockResolvedValue({authenticated:false,response:Response.json({error:'Not authenticated'},{status:401})});
 expect((await GET(new Request('https://example.test'),params)).status).toBe(401);
 expect((await POST(request({}),params)).status).toBe(401);
 expect(getArtistLinkSuggestions).not.toHaveBeenCalled();expect(reviewArtistLinkSuggestion).not.toHaveBeenCalled();
});
it('uses server identity and prevents shared caching',async()=>{
 jest.mocked(getArtistLinkSuggestions).mockResolvedValue({items:[],hasMore:false,nextOffset:null});
 const result=await GET(new Request('https://example.test'),params);
 expect(getArtistLinkSuggestions).toHaveBeenCalledWith(id,id,0);expect(result.headers.get('Cache-Control')).toBe('private, no-store');
 await POST(request({id,kind:'source',decision:'restore',userId:'forged'}),params);
 expect(reviewArtistLinkSuggestion).toHaveBeenCalledWith(id,id,{id,kind:'source',decision:'restore'});
});
it('rejects malformed requests and returns authorization/conflict errors',async()=>{
 expect((await POST(request({id:'bad',kind:'source',decision:'approve'}),params)).status).toBe(400);
 jest.mocked(reviewArtistLinkSuggestion).mockRejectedValue(new OwnershipChangedError());
 expect((await POST(request({id,kind:'source',decision:'approve'}),params)).status).toBe(403);
 jest.mocked(reviewArtistLinkSuggestion).mockRejectedValue(new ArtistLinkConflictError('Already reviewed'));
 expect((await POST(request({id,kind:'source',decision:'approve'}),params)).status).toBe(409);
});
