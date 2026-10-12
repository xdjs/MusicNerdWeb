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
it('sends completed same-page context and preserves the resolved question on explicit retry',async()=>{
 research.mockResolvedValueOnce({answer:'OUT HERE was mixed and mastered by the credited engineer.',sources:[{n:1,title:'Original caption',url:'https://artist.example/original-post'}]});
 research.mockImplementationOnce(async input=>{input.onProgress({jobId,stage:'complete',message:'Checking answer',resolvedQuestion:'Who mixed OUT HERE?'});throw new Error('Verification interrupted');});
 research.mockResolvedValueOnce({answer:'The credited engineer.',sources:[]});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Tell me about OUT HERE'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('OUT HERE was mixed and mastered by the credited engineer.');
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who mixed it?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByRole('button',{name:'Try again'});
 const expected=[{question:'Tell me about OUT HERE',answer:'OUT HERE was mixed and mastered by the credited engineer.',sourceUrls:['https://artist.example/original-post']}];
 expect(research.mock.calls[1][0]).toEqual(expect.objectContaining({question:'Who mixed it?',conversation:expected}));
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));
 await screen.findByText('The credited engineer.');
 expect(research.mock.calls[2][0]).toEqual(expect.objectContaining({question:'Who mixed it?',jobId,conversation:expected,resolvedQuestion:'Who mixed OUT HERE?'}));
 expect(screen.getAllByText('Who mixed it?')).toHaveLength(1);
 expect(screen.queryByText('Who mixed OUT HERE?')).not.toBeInTheDocument();
});
it('bounds prior answers and excludes another artist after navigation',async()=>{
 research.mockResolvedValue({answer:'A'.repeat(3100),sources:[]});
 const view=render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 for(let index=0;index<6;index++){
  fireEvent.change(screen.getByRole('textbox'),{target:{value:`Question ${index}`}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
  await waitFor(()=>expect(screen.getAllByTestId('answer')).toHaveLength(index+1));
 }
 const history=research.mock.calls[5][0].conversation!;
 expect(history.map(turn=>turn.question)).toEqual(['Question 2','Question 3','Question 4']);
 expect(history.every(turn=>turn.answer.length<=3000&&turn.question.length<=500)).toBe(true);
 expect(history.reduce((total,turn)=>total+turn.question.length+turn.answer.length,0)).toBeLessThanOrEqual(12000);
 view.rerender(<AskAboutArtist artistId="a2" artistName="Second"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'New artist question'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await waitFor(()=>expect(research).toHaveBeenCalledTimes(7));
 expect(research.mock.calls[6][0].conversation).toEqual([]);
});
it('uses a short loading label instead of internal research instructions',async()=>{
 research.mockImplementation(input=>{input.onProgress({jobId,stage:'complete',message:'Original evidence is ready to read. Check its scope and qualifications before answering.'});return new Promise(()=>{});});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'What is new?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('Checking Lore…');expect(screen.queryByText(/Original evidence is ready/)).not.toBeInTheDocument();
});
it('retries a terminal worker failure as a fresh bounded request with the same conversation',async()=>{
 research.mockResolvedValueOnce({answer:'Plugin designs.',sources:[{n:1,title:'Original',url:'https://artist.example/post'}]});
 research.mockImplementationOnce(async input=>{input.onProgress({jobId,stage:'checking_saved',message:'Checking saved sources'});return {error:"I couldn't finish that lookup. Please try again.",retryFromStart:true};});
 research.mockResolvedValueOnce({answer:'Another recent update.',sources:[]});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Latest project?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));await screen.findByText('Plugin designs.');
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'What else has he been up to?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText("I couldn't finish that lookup. Please try again.");
 expect(screen.getAllByTestId('answer')).toHaveLength(1);
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByText('Another recent update.');
 expect(research.mock.calls[2][0].jobId).toBeUndefined();expect(research.mock.calls[2][0].conversation).toEqual(research.mock.calls[1][0].conversation);
});
it('keeps outside research progress short and distinct from Lore',async()=>{
 research.mockImplementation(input=>{input.onProgress({jobId,stage:'searching',message:'I have not found enough evidence in the saved originals so now searching outside.'});return new Promise(()=>{});});
 render(<AskAboutArtist artistId="a1" artistName="Artist"/>);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'What is new?'}});fireEvent.click(screen.getByRole('button',{name:'Submit question'}));
 await screen.findByText('Searching outside Lore…');
});
