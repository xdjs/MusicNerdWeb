import { StrictMode } from 'react';
import { act,fireEvent,render,screen,waitFor } from '@testing-library/react';
import AskAboutArtist from '../AskAboutArtist';
import ArtistAskSheet from '../ArtistAskSheet';
import { runArtistResearch } from '@/lib/questionResearch/runArtistResearch';
jest.mock('@/lib/questionResearch/runArtistResearch',()=>({runArtistResearch:jest.fn()}));
const research=jest.mocked(runArtistResearch),jobId='22222222-2222-4222-8222-222222222222';
beforeEach(()=>{localStorage.clear();research.mockReset();});
it.each([true,false])('does not restore or request old saved work on a fresh mount (complete=%s)',async complete=>{
 localStorage.setItem('musicnerd-research:a1',JSON.stringify({version:2,question:'Old question',jobId,complete,savedAt:Date.now()}));
 render(<StrictMode><AskAboutArtist artistId="a1" artistName="Artist"/></StrictMode>);
 await act(async()=>{});
 expect(research).not.toHaveBeenCalled();
 expect(screen.queryByText('Old question')).not.toBeInTheDocument();
 expect(screen.getByText('What would you like to know about Artist?')).toBeVisible();
});
it('retries failed work only on explicit action, updating the same turn and job',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'searching',message:'Checking public reporting.'});throw new Error('Connection interrupted');});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByRole('button',{name:'Try again'});
 expect(research).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await waitFor(()=>expect(research).toHaveBeenCalledTimes(2));
 expect(research).toHaveBeenLastCalledWith(expect.objectContaining({jobId,question:'Who played drums?'}));
 expect(screen.getAllByText('Who played drums?')).toHaveLength(1);
 expect(localStorage.getItem('musicnerd-research:a1')).toBeNull();
});
it('does not show a stale answer after navigating to another artist',async()=>{
 let finish!:(value:{answer:string})=>void;
 research.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'First question'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 view.rerender(<AskAboutArtist artistId="a2" artistName="Second"/>);
 await act(async()=>finish({answer:'STALE answer'}));expect(screen.queryByText('STALE answer')).not.toBeInTheDocument();expect(screen.getByText('What would you like to know about Second?')).toBeInTheDocument();
});
it('stops current polling and keeps explicit retry on the existing turn',async()=>{
 research.mockImplementation(input=>{input.onProgress({jobId,stage:'searching',message:'Checking public reporting.'});return new Promise(()=>{});});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 fireEvent.click(await screen.findByRole('button',{name:'Stop waiting'}));
 expect(research.mock.calls[0][0].signal.aborted).toBe(true);
 expect(screen.getByRole('button',{name:'Try again'})).toBeEnabled();
 expect(screen.getAllByText('Who played drums?')).toHaveLength(1);
});
it('keeps the current answer through minimize/reopen without issuing another request',async()=>{
 research.mockImplementation(async input=>{input.onProgress({jobId,stage:'complete',message:'Checking the sourced answer'});return {answer:'They played drums.',sources:[]};});
 render(<ArtistAskSheet artistId="a1" artistName="Artist"/>);
 expect(research).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Ask about Artist'}));
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who played drums?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('They played drums.');
 fireEvent.click(screen.getByRole('button',{name:'Minimize chat'}));
 fireEvent.click(screen.getByRole('button',{name:'Ask about Artist'}));
 expect(screen.getByText('They played drums.')).toBeVisible();
 expect(research).toHaveBeenCalledTimes(1);
});
