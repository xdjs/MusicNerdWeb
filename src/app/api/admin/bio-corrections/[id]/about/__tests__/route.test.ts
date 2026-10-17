/** @jest-environment node */
import { GET, PUT } from '../route';
import { requireAdmin } from '@/lib/auth-helpers';
import { getCorrectionAbout } from '@/server/utils/bio/getCorrectionAbout';
import { saveCorrectionAbout } from '@/server/utils/bio/saveCorrectionAbout';
import { CorrectionAboutConflict } from '@/lib/bio/correctionAboutTypes';
jest.mock('@/lib/auth-helpers',()=>({requireAdmin:jest.fn()}));
jest.mock('@/server/utils/bio/getCorrectionAbout');
jest.mock('@/server/utils/bio/saveCorrectionAbout');
Response.json=(data,init)=>new Response(JSON.stringify(data),init);
const id='11111111-1111-4111-8111-111111111111';
const context={params:Promise.resolve({id})};
const request=()=>new Request('https://example.test/api',{method:'PUT',body:JSON.stringify({bio:'Updated About',revision:'a'.repeat(64)})});
beforeEach(()=>{jest.clearAllMocks();jest.mocked(requireAdmin).mockResolvedValue({authenticated:true,userId:id,session:{}} as never);});
it.each([401,403])('denies reading and saving without administrator authorization: %s',async status=>{
 jest.mocked(requireAdmin).mockResolvedValue({authenticated:false,response:Response.json({},{status})});
 expect((await GET(request(),context)).status).toBe(status);
 expect((await PUT(request(),context)).status).toBe(status);
 expect(getCorrectionAbout).not.toHaveBeenCalled();expect(saveCorrectionAbout).not.toHaveBeenCalled();
});
it('returns only editable text and revision, never private backing fields',async()=>{
 jest.mocked(getCorrectionAbout).mockResolvedValue({bio:'Current About',revision:'revision',artistId:id,claimed:false});
 const response=await GET(request(),context);
 expect(await response.json()).toEqual({bio:'Current About',revision:'revision'});
 expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('saves with the authenticated reviewer and reports a conflict truthfully',async()=>{
 jest.mocked(saveCorrectionAbout).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new CorrectionAboutConflict('About changed'));
 expect((await PUT(request(),context)).status).toBe(200);
 expect(saveCorrectionAbout).toHaveBeenCalledWith(id,id,'Updated About','a'.repeat(64));
 const response=await PUT(request(),context);expect(response.status).toBe(409);expect(await response.json()).toEqual({error:'About changed'});
});
