import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BioCorrectionDialog from '../BioCorrectionDialog';
import { usePrivy } from '@privy-io/react-auth';
jest.mock('@privy-io/react-auth', () => ({ usePrivy: jest.fn() }));
const login = jest.fn();
beforeEach(() => { sessionStorage.clear(); jest.clearAllMocks(); jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: true, login } as never); global.fetch = jest.fn(); });
it('opens from quiet action and submits the exact displayed bio', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="A published bio" portrait/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.keyDown(screen.getByRole('combobox',{name:'What needs fixing?'}), {key:'ArrowDown'});
 fireEvent.click(screen.getByRole('option',{name:'This is about a different artist'}));
 fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
 await screen.findByRole('status');
 expect(fetch).toHaveBeenCalledWith('/api/artist/artist/bio-corrections', expect.objectContaining({ body: JSON.stringify({ reason: 'wrong_artist', details: '', sourceUrl: '', expectedBio: 'A published bio' }) }));
});
it('lets anonymous visitors inspect form but requires login to send', () => {
 jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: false, login } as never);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.click(screen.getByRole('button', { name: 'Sign in to send' }));
 expect(login).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('shows a stale-bio error without claiming success', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'Reload the profile' }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.click(screen.getByRole('button', { name: 'Send suggestion' }));
 await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Reload the profile'));
 expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('restores a draft after a login reload and requires an explicit send', async () => {
 sessionStorage.setItem('mn:bio-correction:artist', JSON.stringify({reason:'other',details:'Clarify the instrument',sourceUrl:'https://example.test/source',bio:'Original snapshot'}));
 jest.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({success:true})} as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="New snapshot"/>);
 expect(await screen.findByRole('dialog')).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('It has not been submitted yet');
 expect(screen.getByRole('textbox',{name:'Details (optional)'})).toHaveValue('Clarify the instrument');
 expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Send suggestion'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('in the review queue'));
 expect(fetch).toHaveBeenCalledWith('/api/artist/artist/bio-corrections',expect.objectContaining({body:JSON.stringify({reason:'other',details:'Clarify the instrument',sourceUrl:'https://example.test/source',expectedBio:'Original snapshot'})}));
 expect(sessionStorage.getItem('mn:bio-correction:artist')).toBeNull();
});
it('reopens after an in-place login without automatically sending', async () => {
 jest.mocked(usePrivy).mockReturnValue({ready:true,authenticated:false,login} as never);
 const {rerender}=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 fireEvent.click(screen.getByRole('button',{name:'Suggest a correction'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Details (optional)'}),{target:{value:'Keep this draft'}});
 fireEvent.click(screen.getByRole('button',{name:'Sign in to send'}));
 expect(JSON.parse(sessionStorage.getItem('mn:bio-correction:artist')!).details).toBe('Keep this draft');
 jest.mocked(usePrivy).mockReturnValue({ready:true,authenticated:true,login} as never);
 rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(await screen.findByRole('dialog')).toBeVisible();
 expect(screen.getByRole('textbox',{name:'Details (optional)'})).toHaveValue('Keep this draft');
 expect(fetch).not.toHaveBeenCalled();
});
