import { render, screen } from '@testing-library/react';
import SortableArtistLinks from '../SortableArtistLinks';
import { EditModeContext } from '../EditModeContext';
import { getSourceLinks } from '@/lib/musicLinks/getSourceLinks';
jest.mock('next/navigation',()=>({useRouter:()=>({refresh:jest.fn()})}));
jest.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:jest.fn()})}));
it.each([false,true])('renders one usable website icon with existing source-review policy in editing=%s', isEditing=>{
 const sources=[
  {id:'web',url:'https://theelliscourt.com',type:'website',status:'approved'},
  {id:'duplicate',url:'https://theelliscourt.com/',type:'website',status:'approved'},
  {id:'apple',url:'https://music.apple.com/us/artist/pete-rango/1513734272',type:'profile',status:'approved'},
 ];
 render(<EditModeContext.Provider value={{canEdit:true,isEditing,toggle:jest.fn()}}><SortableArtistLinks artistId="artist" section="links" links={[]} supplementalLinks={getSourceLinks(sources)} canEdit /></EditModeContext.Provider>);
 expect(screen.getAllByRole('link',{name:'theelliscourt.com'})).toHaveLength(1);
 expect(screen.getByRole('link',{name:'theelliscourt.com'})).toHaveAttribute('href',sources[0].url);
 expect(screen.getByRole('img',{name:'theelliscourt.com'})).toHaveAttribute('src','/siteIcons/website_icon.svg');
 expect(screen.queryByRole('button',{name:'Remove theelliscourt.com'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Remove Apple Music'})!==null).toBe(isEditing);
});
