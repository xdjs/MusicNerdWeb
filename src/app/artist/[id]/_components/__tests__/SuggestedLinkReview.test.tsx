import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import SuggestedLinkReview from '../SuggestedLinkReview';
import {EditModeContext} from '@/app/_components/EditModeContext';
const item={id:'suggestion-1',kind:'ugc',url:'https://music.apple.com/us/artist/pete/1513734272',title:'Apple Music profile',platform:'apple_music',status:'pending',submittedAt:'2026-10-08T18:15:00Z',suggestedBy:{id:'user-1',name:'Example contributor'},origin:'submission',reviewedAt:null,reviewedBy:null};
jest.mock('@privy-io/react-auth',()=>({getAccessToken:jest.fn().mockResolvedValue('private-token')}));
jest.mock('@/lib/musicNerdApi/musicNerdApiUrl',()=>({musicNerdApiUrl:(path:string)=>`https://api-preview.test${path}`}));
const refresh=jest.fn();
beforeEach(()=>{jest.clearAllMocks();global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({items:[item],hasMore:false})});});
function mount(){return render(<EditModeContext.Provider value={{canEdit:true,isEditing:true,toggle:jest.fn(),refreshProfile:refresh}}><SuggestedLinkReview artistId="artist-1"/></EditModeContext.Provider>);}
it('credits the actual contributor and displays a timestamp before reviewing',async()=>{mount();await waitFor(()=>expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist-1/link-suggestions',expect.objectContaining({headers:{Authorization:'Bearer private-token'},credentials:'omit',cache:'no-store'})));expect(await screen.findByText('Example contributor')).toBeInTheDocument();await waitFor(()=>expect(document.querySelector('time')).toHaveAttribute('datetime',item.submittedAt));expect(screen.getByRole('button',{name:'Add to Links'})).toBeInTheDocument();});
it('posts only the decision and identity of the suggestion, then reloads persisted reviewer attribution',async()=>{
 (fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({items:[item],hasMore:false})}).mockResolvedValueOnce({ok:true,json:async()=>({success:true})}).mockResolvedValueOnce({ok:true,json:async()=>({items:[{...item,status:'approved',reviewedAt:'2026-10-08T18:20:00Z',reviewedBy:{id:'owner',name:'Pete'}}],hasMore:false})});mount();fireEvent.click(await screen.findByRole('button',{name:'Add to Links'}));await waitFor(()=>expect(refresh).toHaveBeenCalled());expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body)).toEqual({id:item.id,kind:'ugc',decision:'approve'});fireEvent.click(await screen.findByText('Recently reviewed (1)'));expect(screen.getByText('Pete')).toBeInTheDocument();expect(screen.getByText('Example contributor')).toBeInTheDocument();});
it('shows a conflict without pretending approval succeeded',async()=>{(fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({items:[item],hasMore:false})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Remove the existing account first.'})});mount();fireEvent.click(await screen.findByRole('button',{name:'Add to Links'}));expect(await screen.findByRole('alert')).toHaveTextContent('Remove the existing account first.');expect(refresh).not.toHaveBeenCalled();});
it('can reach suggestions beyond a page containing only unrelated sources',async()=>{
 (fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({items:[],hasMore:true,nextOffset:100})}).mockResolvedValueOnce({ok:true,json:async()=>({items:[item],hasMore:false,nextOffset:null})});mount();fireEvent.click(await screen.findByRole('button',{name:'Load more'}));expect(await screen.findByText('Example contributor')).toBeInTheDocument();expect(fetch).toHaveBeenLastCalledWith('https://api-preview.test/api/artist/artist-1/link-suggestions?offset=100',expect.objectContaining({cache:'no-store'}));expect(screen.queryByRole('button',{name:'Load more'})).not.toBeInTheDocument();
});
it('restores a removed icon through an explicit server decision',async()=>{
 (fetch as jest.Mock).mockResolvedValueOnce({ok:true,json:async()=>({items:[{...item,kind:'source',status:'approved',hidden:true}],nextOffset:null})});mount();fireEvent.click(await screen.findByText('Recently reviewed (1)'));fireEvent.click(screen.getByRole('button',{name:'Restore link'}));await waitFor(()=>expect(fetch).toHaveBeenCalledWith('https://api-preview.test/api/artist/artist-1/link-suggestions',expect.objectContaining({method:'POST',headers:expect.objectContaining({Authorization:'Bearer private-token'}),body:JSON.stringify({id:item.id,kind:'source',decision:'restore'})})));
});
it('marks automated pending suggestions as needing confirmation without invented evidence',async()=>{
 (fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({items:[{...item,origin:'research'}]})});mount();
 expect(await screen.findByText('Needs confirmation')).toBeInTheDocument();
 expect(screen.getByText('The discovery reason was not saved with this suggestion. Open the profile and check it before adding it.')).toBeInTheDocument();
 expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
});
it('does not call a contributor submission an automated uncertain match',async()=>{
 mount();expect(await screen.findByText('Awaiting review')).toBeInTheDocument();
 expect(screen.queryByText('Needs confirmation')).not.toBeInTheDocument();
 expect(screen.queryByText(/discovery reason was not saved/)).not.toBeInTheDocument();
});
it.each(['approved','rejected'])('does not show a pending uncertainty badge after %s',async status=>{
 (fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({items:[{...item,origin:'research',status}]})});mount();
 fireEvent.click(await screen.findByText('Recently reviewed (1)'));
 expect(screen.queryByText('Needs confirmation')).not.toBeInTheDocument();
 expect(screen.queryByText('Awaiting review')).not.toBeInTheDocument();
});
it('shows recorded discovery observations as evidence, not ownership proof',async()=>{
 const evidence={method:'name_handle_probe',summary:'A handle based on the artist name was found and its page title matched.',artistName:'Example artist',sourceUrl:item.url,observedTitle:'Example artist on Apple Music'};
 (fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({items:[{...item,origin:'research',evidence}]})});mount();
 expect(await screen.findByText(evidence.summary)).toBeInTheDocument();
 expect(screen.getByText('Example artist on Apple Music')).toBeInTheDocument();
 expect(screen.getByText('This explains how it was found, not proof that the account belongs to you.')).toBeInTheDocument();
 expect(screen.queryByText(/discovery reason was not saved/)).not.toBeInTheDocument();
});
it('renders recorded text literally rather than HTML',async()=>{
 (fetch as jest.Mock).mockResolvedValue({ok:true,json:async()=>({items:[{...item,origin:'research',evidence:{method:'name_web_search',summary:'<script>not trusted</script>',artistName:'Example',sourceUrl:item.url,observedTitle:'<img src=x onerror=alert(1)>'}}]})});mount();
 expect(await screen.findByText('<script>not trusted</script>')).toBeInTheDocument();
 expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
 expect(document.querySelector('script')).toBeNull();
 expect(document.querySelector('img')).toBeNull();
});
