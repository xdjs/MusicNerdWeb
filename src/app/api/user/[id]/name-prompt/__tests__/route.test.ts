/** @jest-environment node */
const auth=jest.fn(); const execute=jest.fn();
jest.mock('@/lib/auth-helpers',()=>({requireAuth:()=>auth()}));
jest.mock('@/server/db/drizzle',()=>({db:{execute:(...args:unknown[])=>execute(...args)}}));
let POST: typeof import('../route').POST;
beforeAll(async () => { jest.resetModules(); ({ POST } = await import('../route')); });
if (!Response.json) Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: {'Content-Type':'application/json'} });
const call=(id:string)=>POST(new Request('https://example.test',{method:'POST'}),{params:Promise.resolve({id})});
beforeEach(()=>jest.clearAllMocks());
it('requires authentication and the same account',async()=>{
 auth.mockResolvedValue({authenticated:false,response:Response.json({}, {status:401})});expect((await call('a')).status).toBe(401);
 auth.mockResolvedValue({authenticated:true,session:{user:{id:'a'}}});expect((await call('b')).status).toBe(403);expect(execute).not.toHaveBeenCalled();
});
it('only opens for the request that marked the previously unshown prompt',async()=>{
 auth.mockResolvedValue({authenticated:true,session:{user:{id:'a'}}});execute.mockResolvedValueOnce([{id:'a'}]).mockResolvedValueOnce([]);
 expect(await (await call('a')).json()).toEqual({showPrompt:true});expect(await (await call('a')).json()).toEqual({showPrompt:false});
});
