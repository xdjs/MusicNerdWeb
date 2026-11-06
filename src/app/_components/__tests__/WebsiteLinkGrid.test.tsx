import { render, screen } from '@testing-library/react';
import SortableArtistLinks from '../SortableArtistLinks';
import { EditModeContext } from '../EditModeContext';
import PressAndFeatures from '@/app/artist/[id]/_components/PressAndFeatures';
import { within } from '@testing-library/react';
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

it.each([false,true])('routes the recorded inventory and a local biography reclassification in editing=%s', isEditing => {
 const home={id:'home',url:'https://theelliscourt.com/',type:'website',status:'approved',title:'The Ellis Court'};
 const bio={id:'bio',url:'https://theelliscourt.com/whats-the-ellis-court-2/',type:'website',status:'approved',title:'The Ellis Court biography'};
 const substack={id:'substack',url:'https://theelliscourt.substack.com/',type:'article',status:'approved',title:'Ellis Court Substack'};
 const support={id:'support',url:'https://theelliscourt.bandcamp.com/',type:'profile',status:'approved'};
 const view=(biography:typeof bio)=>{
  const sources=[home,biography,substack,support];
  return <EditModeContext.Provider value={{canEdit:true,isEditing,toggle:jest.fn()}}>
   <div data-testid="links"><SortableArtistLinks artistId="fixture" section="links" links={[]} supplementalLinks={getSourceLinks(sources)} canEdit /></div>
   <div data-testid="support"><SortableArtistLinks artistId="fixture" section="support" links={[]} supplementalLinks={getSourceLinks(sources,[],'support')} canEdit={false} /></div>
   <div data-testid="lore"><PressAndFeatures sources={sources} /></div>
  </EditModeContext.Provider>;
 };
 const {rerender}=render(view(bio));
 expect(within(screen.getByTestId('links')).getAllByRole('link')).toHaveLength(1);
 expect(within(screen.getByTestId('links')).queryByRole('link',{name:/whats-the-ellis/})).toBeNull();
 expect(within(screen.getByTestId('support')).getByRole('link',{name:'Bandcamp'})).toHaveAttribute('href',support.url);
 expect(within(screen.getByTestId('lore')).getByRole('link',{name:/Ellis Court Substack/})).toHaveAttribute('href',substack.url);
 expect(within(screen.getByTestId('lore')).getByRole('link',{name:/The Ellis Court biography/})).toHaveAttribute('href',bio.url);
 // Local fixture only: illustrates the existing source-review correction, without changing saved data.
 rerender(view({...bio,type:'article'}));
 expect(within(screen.getByTestId('links')).getAllByRole('link')).toHaveLength(1);
 expect(within(screen.getByTestId('lore')).getByRole('link',{name:/The Ellis Court biography/})).toHaveAttribute('href',bio.url);
});
