import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePrivy } from '@privy-io/react-auth';
import ArtistInterviews from '../ArtistInterviews';
import { requestInterviewResponses } from '@/lib/interviewResponses/requestInterviewResponses';
jest.mock('@privy-io/react-auth',()=>({usePrivy:jest.fn()}));
jest.mock('@/lib/interviewResponses/requestInterviewResponses',()=>({requestInterviewResponses:jest.fn()}));
const request=requestInterviewResponses as jest.Mock;
const auth=usePrivy as jest.Mock;
const answer={id:'a',questionKey:'q',question:'Which take?',answer:'Only the demo.',source:'followup',sitting:2,offeredAt:null,answerUpdatedAt:null,revision:'a'.repeat(64)};
beforeEach(()=>{jest.clearAllMocks();auth.mockReturnValue({ready:true,authenticated:true,user:{id:'owner'}});});
it('keeps failures distinct from empty interviews and can retry',async()=>{
 request.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValueOnce({status:'ok',responses:[],nextCursor:null});
 render(<ArtistInterviews artistId="artist"/>);
 await screen.findByRole('alert');expect(screen.queryByText(/No saved interview responses/)).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Try again'}));await screen.findByText(/No saved interview responses/);
});
it('clears private state on account changes and ignores the previous account request',async()=>{
 let finish!:(value:unknown)=>void;
 request.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce({status:'ok',responses:[],nextCursor:null});
 const {rerender}=render(<ArtistInterviews artistId="artist"/>);
 auth.mockReturnValue({ready:true,authenticated:true,user:{id:'different'}});rerender(<ArtistInterviews artistId="artist"/>);
 await screen.findByText(/No saved interview responses/);
 finish({status:'ok',responses:[answer],nextCursor:null});
 await waitFor(()=>expect(request).toHaveBeenCalledTimes(2));
 expect(screen.queryByText('Only the demo.')).not.toBeInTheDocument();
});
it('keeps an unsaved response when moving between pages',async()=>{
 request.mockResolvedValueOnce({status:'ok',responses:[answer],nextCursor:'next'}).mockResolvedValueOnce({status:'ok',responses:[{...answer,id:'b',question:'Another question?'}],nextCursor:null});
 render(<ArtistInterviews artistId="artist"/>);
 await screen.findByText('Which take?');fireEvent.click(screen.getByText('Which take?'));
 fireEvent.click(screen.getByRole('button',{name:'Edit response'}));fireEvent.change(screen.getByLabelText('Your response'),{target:{value:'Unfinished words'}});
 fireEvent.click(screen.getByRole('button',{name:'Next'}));await screen.findByText('Another question?');fireEvent.click(screen.getByRole('button',{name:'Previous'}));
 expect(screen.getByLabelText('Your response')).toHaveValue('Unfinished words');
});
