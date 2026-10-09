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
