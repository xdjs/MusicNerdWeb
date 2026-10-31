import {render,screen,fireEvent} from '@testing-library/react';
import EvidenceChatPreview from '../EvidenceChatPreview';
jest.mock('../../../artist/[id]/_components/AskAboutArtist',()=>{
 const React=jest.requireActual('react');
 return {__esModule:true,default: function Chat(){const [turns,setTurns]=React.useState(0);return <button onClick={()=>setTurns((n:number)=>n+1)}>Turns {turns}</button>}};
});
it('starts empty and resets a same-artist same-mode conversation only on explicit start',()=>{
 render(<EvidenceChatPreview />);expect(screen.queryByText('Turns 0')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Artist ID'),{target:{value:'11111111-1111-4111-8111-111111111111'}});
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));fireEvent.click(screen.getByText('Turns 0'));expect(screen.getByText('Turns 1')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));expect(screen.getByText('Turns 0')).toBeVisible();
});
