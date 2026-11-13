import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BioCorrectionDialog from '../BioCorrectionDialog';
import { usePrivy } from '@privy-io/react-auth';
jest.mock('@privy-io/react-auth', () => ({ usePrivy: jest.fn(), getAccessToken: jest.fn(async () => 'private-token') }));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl', () => ({ musicNerdApiUrl: (path: string) => `https://api-preview.test${path}` }));
jest.mock('@/hooks/useMusicNerdUser', () => ({ useMusicNerdUser: () => ({status: mockAccountStatus}) }));
let mockAccountStatus = 'authenticated';
const login = jest.fn();
beforeEach(() => { mockAccountStatus = 'authenticated'; sessionStorage.clear(); jest.clearAllMocks(); jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: true, login } as never); global.fetch = jest.fn(); });
it('opens from quiet action and submits the exact displayed bio', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ success: true }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="A published bio" portrait/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.keyDown(screen.getByRole('combobox',{name:'What needs fixing?'}), {key:'ArrowDown'});
 fireEvent.click(screen.getByRole('option',{name:'This is about a different artist'}));
 fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
 await screen.findByRole('status');
 expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist/bio-corrections', expect.objectContaining({ credentials: 'omit', headers: expect.objectContaining({ Authorization: 'Bearer private-token' }), body: JSON.stringify({ reason: 'wrong_artist', details: '', sourceUrl: '', expectedBio: 'A published bio' }) }));
});
it('opens login before showing the report form to anonymous visitors', () => {
 jest.mocked(usePrivy).mockReturnValue({ ready: true, authenticated: false, login } as never);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(login).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('shows a stale-bio error without claiming success', async () => {
 jest.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({ error: 'Reload the profile' }) } as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Dutchyyy" bio="bio"/>);
 fireEvent.click(screen.getByRole('button', { name: 'Suggest a correction' }));
 fireEvent.click(screen.getByRole('button', { name: 'Submit report' }));
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
 fireEvent.click(screen.getByRole('button',{name:'Submit report'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('in our review queue'));
 expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist/bio-corrections',expect.objectContaining({body:JSON.stringify({reason:'other',details:'Clarify the instrument',sourceUrl:'https://example.test/source',expectedBio:'Original snapshot'})}));
 expect(sessionStorage.getItem('mn:bio-correction:artist')).toBeNull();
});
it('transitions the same dialog from sign-in progress to the form without a reload', async () => {
 mockAccountStatus='unauthenticated';
 jest.mocked(usePrivy).mockReturnValue({ready:true,authenticated:false,login} as never);
 const {rerender}=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 fireEvent.click(screen.getByRole('button',{name:'Suggest a correction'}));
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(sessionStorage.getItem('mn:bio-correction:artist')).not.toBeNull();
 jest.mocked(usePrivy).mockReturnValue({ready:true,authenticated:true,login} as never);
 rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(await screen.findByRole('dialog')).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('Finishing sign-in');
 expect(screen.queryByRole('button',{name:'Submit report'})).not.toBeInTheDocument();
 const dialog = screen.getByRole('dialog');
 mockAccountStatus='authenticated';
 rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.getByRole('dialog')).toBe(dialog);
 expect(screen.getByRole('button',{name:'Submit report'})).toBeVisible();
 expect(fetch).not.toHaveBeenCalled();
});
it('keeps the restored draft through the subsequent NextAuth page reload', async () => {
 sessionStorage.setItem('mn:bio-correction:artist',JSON.stringify({reason:'other',details:'Survive both login stages',sourceUrl:'https://example.test',bio:'Original About'}));
 const first=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Original About"/>);
 expect(await screen.findByRole('dialog')).toBeVisible();
 expect(sessionStorage.getItem('mn:bio-correction:artist')).not.toBeNull();
 first.unmount();
 render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Original About"/>);
 expect(await screen.findByRole('dialog')).toBeVisible();
 expect(screen.getByRole('textbox',{name:'Details (optional)'})).toHaveValue('Survive both login stages');
 expect(fetch).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Close'}));
 expect(sessionStorage.getItem('mn:bio-correction:artist')).toBeNull();
});

it('waits for the application session before opening the report form',()=>{
 mockAccountStatus='loading';
 sessionStorage.setItem('mn:bio-correction:artist',JSON.stringify({reason:'other',details:'',sourceUrl:'',bio:'Bio'}));
 const {rerender}=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.getByRole('status')).toHaveTextContent('Finishing sign-in');
 expect(screen.queryByRole('button',{name:'Submit report'})).not.toBeInTheDocument();
 mockAccountStatus='authenticated';
 rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.getByRole('dialog')).toBeVisible();
 expect(fetch).not.toHaveBeenCalled();
});
it('clearly distinguishes an exact duplicate from a newly saved report',async()=>{
 jest.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({success:true,duplicate:true})} as Response);
 render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 fireEvent.click(screen.getByRole('button',{name:'Suggest a correction'}));
 fireEvent.click(screen.getByRole('button',{name:'Submit report'}));
 expect(await screen.findByRole('heading',{name:'Report already received'})).toBeVisible();
 expect(screen.getByRole('status')).toHaveTextContent('No duplicate was added');
});

it.each([false,true])('starts a fresh report after confirmation (duplicate=%s)', async duplicate => {
 jest.mocked(fetch).mockResolvedValue({ok:true,json:async()=>({success:true,duplicate})} as Response);
 const {rerender}=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="First About"/>);
 fireEvent.click(screen.getByRole('button',{name:'Suggest a correction'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Details (optional)'}),{target:{value:'First correction'}});
 fireEvent.click(screen.getByRole('button',{name:'Submit report'}));
 await screen.findByRole('heading',{name:duplicate?'Report already received':'Report received'});
 fireEvent.click(screen.getByRole('button',{name:'Done'}));
 rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Updated About"/>);
 fireEvent.click(screen.getByRole('button',{name:'Suggest a correction'}));
 expect(screen.getByRole('textbox',{name:'Details (optional)'})).toHaveValue('');
 expect(fetch).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByRole('textbox',{name:'Details (optional)'}),{target:{value:'Second correction'}});
 fireEvent.click(screen.getByRole('button',{name:'Submit report'}));
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));
 expect(JSON.parse(jest.mocked(fetch).mock.calls[1][1]!.body as string)).toMatchObject({details:'Second correction',expectedBio:'Updated About'});
});

it('shows the saved login handoff while the auth SDK initializes after reload',()=>{
 sessionStorage.setItem('mn:bio-correction:artist',JSON.stringify({reason:'other',details:'Keep my draft',sourceUrl:'',bio:'Bio'}));
 jest.mocked(usePrivy).mockReturnValue({ready:false,authenticated:false,login} as never);
 mockAccountStatus='loading';
 const view=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.getByRole('status')).toHaveTextContent('Finishing sign-in');
 expect(screen.queryByRole('button',{name:'Submit report'})).not.toBeInTheDocument();
 jest.mocked(usePrivy).mockReturnValue({ready:true,authenticated:true,login} as never);
 mockAccountStatus='authenticated';
 view.rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.getByRole('textbox',{name:'Details (optional)'})).toHaveValue('Keep my draft');
 expect(fetch).not.toHaveBeenCalled();
});
it('allows cancelling the finishing state without reopening or submitting',()=>{
 sessionStorage.setItem('mn:bio-correction:artist',JSON.stringify({reason:'other',details:'Draft',sourceUrl:'',bio:'Bio'}));
 mockAccountStatus='loading';
 const view=render(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 fireEvent.click(screen.getByRole('button',{name:'Close'}));
 mockAccountStatus='authenticated';
 view.rerender(<BioCorrectionDialog artistId="artist" artistName="Artist" bio="Bio"/>);
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 expect(sessionStorage.getItem('mn:bio-correction:artist')).toBeNull();
 expect(fetch).not.toHaveBeenCalled();
});
