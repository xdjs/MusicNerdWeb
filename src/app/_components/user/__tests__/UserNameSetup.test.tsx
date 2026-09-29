import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import UserNameSetup from '../UserNameSetup';
const update=jest.fn().mockResolvedValue({});
const refresh=jest.fn();
let session: any;
jest.mock('next-auth/react',()=>({useSession:()=>({data:session,status:session?'authenticated':'unauthenticated',update})}));
jest.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
const originalFetch=global.fetch;
beforeEach(()=>{session={user:{id:'account',name:'Aux Bandit'}};jest.clearAllMocks();});
afterEach(()=>{global.fetch=originalFetch;});
it('prompts once, permits dismissal, and reopens from the profile reminder',async()=>{
 global.fetch=jest.fn().mockResolvedValueOnce({ok:true,json:async()=>({id:'account',username:'Aux Bandit',usernameNeedsConfirmation:true,usernamePromptedAt:null})})
 .mockResolvedValueOnce({ok:true,json:async()=>({showPrompt:true})})
 .mockResolvedValueOnce({ok:true,json:async()=>({status:'success'})});
 render(<UserNameSetup/>);
 await screen.findByRole('dialog');
 fireEvent.click(screen.getByRole('button',{name:'Close'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 fireEvent(window,new Event('musicnerd:choose-user-name'));
 await screen.findByRole('dialog');
 fireEvent.click(screen.getByRole('button',{name:'Continue'}));
 await waitFor(()=>expect(update).toHaveBeenCalled());
 expect((global.fetch as jest.Mock).mock.calls[2][1].body).toBe(JSON.stringify({username:'Aux Bandit'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it.each([false,true])('does not auto-prompt a confirmed or previously prompted account (%s)',async confirmed=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({id:'account',username:'Aux Bandit',usernameNeedsConfirmation:!confirmed,usernamePromptedAt:confirmed?null:'2026-09-29'})});
 render(<UserNameSetup/>);
 await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('never loads account setup while logged out',()=>{session=null;global.fetch=jest.fn();render(<UserNameSetup/>);expect(global.fetch).not.toHaveBeenCalled();});
