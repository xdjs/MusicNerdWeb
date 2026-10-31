import {render,screen,fireEvent} from '@testing-library/react';
import EvidenceChatPreview from '../EvidenceChatPreview';
jest.mock('../../../artist/[id]/_components/AskAboutArtist',()=>{
 const React=jest.requireActual('react');
 return {__esModule:true,default: function Chat(props: {diagnosticFetch?: typeof fetch; replayTransport?: unknown}){const [turns,setTurns]=React.useState(0);return <button data-recorder={props.diagnosticFetch ? "on" : "off"} data-replay={props.replayTransport ? "on" : "off"} onClick={()=>setTurns((n:number)=>n+1)}>Turns {turns}</button>}};
});
it('starts empty and resets a same-artist same-mode conversation only on explicit start',()=>{
 render(<EvidenceChatPreview />);expect(screen.queryByText('Turns 0')).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Artist ID'),{target:{value:'11111111-1111-4111-8111-111111111111'}});
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));fireEvent.click(screen.getByText('Turns 0'));expect(screen.getByText('Turns 1')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));expect(screen.getByText('Turns 0')).toBeVisible();
});

it('injects recording only into the explicit saved-source selection',()=>{
 render(<EvidenceChatPreview />);
 fireEvent.change(screen.getByLabelText('Artist ID'),{target:{value:'11111111-1111-4111-8111-111111111111'}});
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-recorder','off');
 fireEvent.change(screen.getByLabelText('Response mode'),{target:{value:'source_passages'}});
 fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-recorder','on');
});
it('keeps offline replay independent from network recording',()=>{
 render(<EvidenceChatPreview replay />);fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-recorder','off');
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-replay','on');
 expect(screen.queryByRole('region',{name:'Preview evidence recorder'})).toBeNull();
});
it('locks offline recorder fixture into the real SDK/custom-fetch path, not the replay transport',()=>{
 render(<EvidenceChatPreview recorderFixture />);fireEvent.click(screen.getByRole('button',{name:'Start a new conversation'}));
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-recorder','on');
 expect(screen.getByText('Turns 0')).toHaveAttribute('data-replay','off');
 expect(screen.getByLabelText('Response mode')).toBeDisabled();
 expect(screen.getByLabelText('Artist ID')).toHaveAttribute('readonly');
 expect(screen.getByRole('region',{name:'Preview evidence recorder'})).toBeInTheDocument();
});
