import { act,fireEvent,render,screen,waitFor } from '@testing-library/react';
import AskAboutArtist from '../AskAboutArtist';
import { runArtistResearch } from '@/lib/questionResearch/runArtistResearch';
jest.mock('@/lib/questionResearch/runArtistResearch',()=>({runArtistResearch:jest.fn()}));
const research=jest.mocked(runArtistResearch),jobId='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{localStorage.clear();research.mockReset();});
it('shows outside-Lore progress and offers explicit saved-job resume after a new session',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'searching',message:"I haven't found this in Lore. Checking public reporting."});throw new Error('Connection interrupted');});
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByRole('button',{name:/Resume saved research/});view.unmount();research.mockClear();
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 const resume=await screen.findByRole('button',{name:/Resume saved research/});expect(research).not.toHaveBeenCalled();fireEvent.click(resume);
 await waitFor(()=>expect(research).toHaveBeenCalledWith(expect.objectContaining({jobId,question:'Who played drums?'})));
});
it('reopens the same checked answer after an artist page remount without new research',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'complete',message:'Checking the sourced answer'});return {answer:'They played drums.',sources:[]};});
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('They played drums.');view.unmount();research.mockClear();
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 const reopen=await screen.findByRole('button',{name:/Reopen saved answer/});
 expect(research).not.toHaveBeenCalled();fireEvent.click(reopen);
 await waitFor(()=>expect(research).toHaveBeenCalledWith(expect.objectContaining({jobId,question:'Who played drums?'})));
});
it('does not show a stale answer after navigating to another artist',async()=>{
 let finish!:(value:{answer:string})=>void;
 research.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'First question'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 view.rerender(<AskAboutArtist artistId="a2" artistName="Second"/>);
 await act(async()=>finish({answer:'STALE answer'}));expect(screen.queryByText('STALE answer')).not.toBeInTheDocument();expect(screen.getByText('What would you like to know about Second?')).toBeInTheDocument();
});
