import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import InterviewOffer from '../InterviewOffer';
import {EditModeContext} from '@/app/_components/EditModeContext';
import type {InterviewTransport} from '@/lib/interview/interviewTransport';
jest.mock('../ProfileTour',()=>({TOUR_FINISHED_EVENT:'tour-finished'}));
jest.mock('../InterviewPanel',()=>({__esModule:true,default:({onPause}:{onPause:(questions:unknown[])=>void})=> <div>Open interview<button onClick={()=>onPause([{key:'one',question:'What inspired this?'}])}>Finish with saved questions</button></div>}));
const questions=[{key:'one',question:'What inspired this?'}];
function setup(resuming=false){
 const transport={invite:jest.fn().mockResolvedValue({show:true,reason:'new-material',resuming,draftScope:'u1',questions}),offered:jest.fn().mockResolvedValue({success:true}),answer:jest.fn(),finish:jest.fn()} satisfies InterviewTransport;
 render(<EditModeContext.Provider value={{canEdit:true,isEditing:false,toggle:()=>{}}}><InterviewOffer artistId="a1" artistName="Nova" transport={transport}/></EditModeContext.Provider>);
 return transport;
}
it('postpones an invitation without treating the questions as skipped',async()=>{
 const transport=setup();
 fireEvent.click(await screen.findByRole('button',{name:'Not now'}));
 await waitFor(()=>expect(screen.queryByRole('button',{name:'Not now'})).not.toBeInTheDocument());
 expect(screen.queryByRole('button',{name:'Continue interview'})).not.toBeInTheDocument();
 expect(transport.offered).toHaveBeenCalledWith('a1',questions);
 expect(transport.answer).not.toHaveBeenCalled();
 expect(screen.queryByText('Open interview')).not.toBeInTheDocument();
});
it('shows a quiet resume action on return and never auto-opens it after the tour',async()=>{
 setup(true);
 await screen.findByRole('button',{name:'Continue interview'});
 window.dispatchEvent(new CustomEvent('tour-finished',{detail:'a1'}));
 await waitFor(()=>expect(screen.queryByText('Open interview')).not.toBeInTheDocument());
});
it('keeps the invitation actionable when postponing fails',async()=>{
 const transport=setup();transport.offered.mockResolvedValue({success:false});
 fireEvent.click(await screen.findByRole('button',{name:'Not now'}));
 await screen.findByRole('alert');
 expect(screen.getByRole('button',{name:'Start'})).toBeEnabled();
});

it('hides a paused interview until the offer mounts on a new visit',async()=>{
 const transport=setup();
 fireEvent.click(await screen.findByRole('button',{name:'Start'}));
 fireEvent.click(screen.getByRole('button',{name:'Finish with saved questions'}));
 expect(screen.queryByRole('button',{name:'Continue interview'})).not.toBeInTheDocument();
 expect(screen.queryByText('Open interview')).not.toBeInTheDocument();
 window.dispatchEvent(new CustomEvent('tour-finished',{detail:'a1'}));
 await waitFor(()=>expect(transport.invite).toHaveBeenCalledTimes(1));
 expect(screen.queryByText('Open interview')).not.toBeInTheDocument();
});
