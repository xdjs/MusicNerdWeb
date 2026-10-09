import { StrictMode } from 'react';
import { act,fireEvent,render,screen,waitFor } from '@testing-library/react';
import AskAboutArtist from '../AskAboutArtist';
import ArtistAskSheet from '../ArtistAskSheet';
import { runArtistResearch } from '@/lib/questionResearch/runArtistResearch';
jest.mock('@/lib/questionResearch/runArtistResearch',()=>({runArtistResearch:jest.fn()}));
const research=jest.mocked(runArtistResearch),jobId='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{localStorage.clear();research.mockReset();});
it('restores interrupted research inline after a new session and retries the same turn',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'searching',message:"I haven't found this in Lore. Checking public reporting."});throw new Error('Connection interrupted');});
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByRole('button',{name:'Try again'});view.unmount();research.mockClear();
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 await screen.findByRole('button',{name:'Try again'});
 expect(screen.queryByText(/Resume saved research/)).not.toBeInTheDocument();
 expect(research).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await waitFor(()=>expect(research).toHaveBeenCalledTimes(2));
 expect(screen.getAllByText('Who played drums?')).toHaveLength(1);
 await waitFor(()=>expect(research).toHaveBeenCalledWith(expect.objectContaining({jobId,question:'Who played drums?'})));
});
it('reopens the same checked answer after an artist page remount without new research',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'complete',message:'Checking the sourced answer'});return {answer:'They played drums.',sources:[]};});
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('They played drums.');view.unmount();research.mockClear();
 render(<StrictMode><AskAboutArtist artistId="a1" artistName="Artist"/></StrictMode>);
 await screen.findByText('They played drums.');
 expect(screen.queryByText(/Reopen saved answer/)).not.toBeInTheDocument();
 expect(research).toHaveBeenCalledTimes(1);
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

it.each([Date.now()-25*60*60_000, Date.now()+60_000])('ignores expired or future recovery records (%s)',async savedAt=>{
 localStorage.setItem('musicnerd-research:a1',JSON.stringify({version:2,question:'Old question',jobId,complete:true,savedAt}));
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 await act(async()=>{});
 expect(research).not.toHaveBeenCalled();
 expect(localStorage.getItem('musicnerd-research:a1')).toBeNull();
});
it('stops restored polling and keeps explicit retry on the existing turn',async()=>{
 localStorage.setItem('musicnerd-research:a1',JSON.stringify({version:2,question:'Who played drums?',jobId,complete:false,savedAt:Date.now()}));
 research.mockImplementation(()=>new Promise(()=>{}));
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.click(await screen.findByRole('button',{name:'Stop waiting'}));
 expect(research.mock.calls[0][0].signal.aborted).toBe(true);
 expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled();
 expect(screen.getAllByText('Who played drums?')).toHaveLength(1);
 expect(JSON.parse(localStorage.getItem('musicnerd-research:a1')!).jobId).toBe(jobId);
});

it('does not reconnect merely on a profile visit, and minimizing keeps the conversation',async()=>{
 localStorage.setItem('musicnerd-research:a1',JSON.stringify({version:2,question:'Who played drums?',jobId,complete:true,savedAt:Date.now()}));
 research.mockResolvedValue({answer:'They played drums.',sources:[]});
 render(<ArtistAskSheet artistId="a1" artistName="Artist"/>);
 await act(async()=>{});
 expect(research).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Ask about Artist'}));
 await screen.findByText('They played drums.');
 fireEvent.click(screen.getByRole('button',{name:'Minimize chat'}));
 fireEvent.click(screen.getByRole('button',{name:'Ask about Artist'}));
 expect(screen.getByText('They played drums.')).toBeVisible();
 expect(research).toHaveBeenCalledTimes(1);
});
