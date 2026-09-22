import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NonDspArtistRequest from '../NonDspArtistRequest';
it('prepares the draft and copies it without submitting or sending',async()=>{
 const writeText=jest.fn().mockResolvedValue(undefined);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<NonDspArtistRequest/>);
 fireEvent.click(screen.getByText('Don’t release on Spotify or Deezer?'));
 fireEvent.change(screen.getByLabelText('Artist name'),{target:{value:'Local Artist'}});
 fireEvent.change(screen.getByLabelText('Music and profile links'),{target:{value:'https://local.bandcamp.com'}});
 const draft=new URL(screen.getByRole('link',{name:'Open email draft'}).getAttribute('href')!);
 expect(draft.searchParams.get('body')).toContain('https://local.bandcamp.com');
 fireEvent.click(screen.getByRole('button',{name:'No email app? Copy request'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Request copied'));
 expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Local Artist'));
});
it('offers manual copy when clipboard access fails',async()=>{
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:jest.fn().mockRejectedValue(new Error('denied'))}});
 render(<NonDspArtistRequest/>);
 fireEvent.click(screen.getByText('Don’t release on Spotify or Deezer?'));
 fireEvent.click(screen.getByRole('button',{name:'No email app? Copy request'}));
 expect((await screen.findByLabelText('Request to copy') as HTMLTextAreaElement).value).toContain('To: dev@xdjs.com');
});
