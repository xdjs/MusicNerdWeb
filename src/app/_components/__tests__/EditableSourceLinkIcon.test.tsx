import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import EditableLinkIcon from '../EditableLinkIcon';
import {EditModeContext} from '../EditModeContext';
const refresh=jest.fn();
jest.mock('next/navigation',()=>({useRouter:()=>({refresh:jest.fn()})}));
jest.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:jest.fn()})}));
it('removes source-backed visibility through its source identity, never a nonexistent artist column',async()=>{
 global.fetch=jest.fn().mockResolvedValue({ok:true});render(<EditModeContext.Provider value={{canEdit:true,isEditing:true,toggle:jest.fn(),refreshProfile:refresh}}><EditableLinkIcon artistId="artist" siteName="apple_music" sourceId="source-1" href="https://music.apple.com/us/artist/pete/1513734272" iconSrc="/siteIcons/applemusic_icon.svg" label="Apple Music"/></EditModeContext.Provider>);
 fireEvent.click(screen.getByRole('button',{name:'Remove Apple Music'}));await waitFor(()=>expect(refresh).toHaveBeenCalled());expect(fetch).toHaveBeenCalledWith('/api/artist/artist/link-suggestions',expect.objectContaining({body:JSON.stringify({id:'source-1',kind:'source',decision:'remove'})}));
});

it.each([false,true])('renders the website as an accessible icon link in editing=%s', isEditing=>{
 render(<EditModeContext.Provider value={{canEdit:true,isEditing,toggle:jest.fn()}}><EditableLinkIcon artistId="artist" siteName="source:web" sourceId="web" href="https://theelliscourt.com/" iconSrc="/siteIcons/website_icon.svg" label="theelliscourt.com"/></EditModeContext.Provider>);
 expect(screen.getByRole('link',{name:'theelliscourt.com'})).toHaveAttribute('href','https://theelliscourt.com/');
 expect(screen.getByRole('img',{name:'theelliscourt.com'})).toHaveAttribute('src','/siteIcons/website_icon.svg');
 expect(screen.queryByRole('button',{name:'Remove theelliscourt.com'})!==null).toBe(isEditing);
});
