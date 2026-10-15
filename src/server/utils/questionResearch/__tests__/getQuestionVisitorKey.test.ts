/** @jest-environment node */
import { getQuestionVisitorKey } from '../getQuestionVisitorKey';
import { getServerAuthSession } from '@/server/auth';
jest.mock('@/server/auth',()=>({getServerAuthSession:jest.fn()}));
jest.mock('@/env',()=>({MUSICNERD_RESEARCH_API_KEY:'s'.repeat(32)}));
const request=(ip?:string)=>new Request('https://example.test/api/askArtist',{headers:ip?{'x-real-ip':ip}:{}});
beforeEach(()=>{jest.mocked(getServerAuthSession).mockResolvedValue(null);process.env.VERCEL='1';});
afterEach(()=>{delete process.env.VERCEL;});
it('uses verified account identity regardless of IP, and isolates different accounts',async()=>{
 jest.mocked(getServerAuthSession).mockResolvedValue({user:{id:'user-one'}} as never);
 const first=await getQuestionVisitorKey(request('192.0.2.1'));
 expect(first).toMatch(/^[a-f0-9]{64}$/);
 expect(await getQuestionVisitorKey(request('192.0.2.2'))).toBe(first);
 jest.mocked(getServerAuthSession).mockResolvedValue({user:{id:'user-two'}} as never);
 expect(await getQuestionVisitorKey(request('192.0.2.1'))).not.toBe(first);
});
it('hashes trusted anonymous IP without accepting arbitrary identity headers',async()=>{
 const first=await getQuestionVisitorKey(request('192.0.2.1'));
 expect(first).toMatch(/^[a-f0-9]{64}$/);
 expect(await getQuestionVisitorKey(new Request('https://example.test',{headers:{'x-real-ip':'192.0.2.1','x-user-id':'fake'}}))).toBe(first);
 expect(await getQuestionVisitorKey(request('192.0.2.2'))).not.toBe(first);
});
it('normalizes equivalent IPv6 addresses',async()=>{
 expect(await getQuestionVisitorKey(request('2001:db8::1'))).toBe(await getQuestionVisitorKey(request('2001:0db8:0:0:0:0:0:1')));
});
it('fails closed when no verified identity or trusted valid IP exists',async()=>{
 await expect(getQuestionVisitorKey(request())).rejects.toThrow();
 await expect(getQuestionVisitorKey(request('not-an-ip'))).rejects.toThrow();
 delete process.env.VERCEL;
 await expect(getQuestionVisitorKey(request('192.0.2.1'))).rejects.toThrow();
});
