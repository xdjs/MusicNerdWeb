import { render, screen, fireEvent } from '@testing-library/react';
import IntentExplorer from '../IntentExplorer';
import { evidence, timeline, visualWorld } from '@/lib/intent/latashaSnapshot';
jest.mock('@/app/_components/ThemeProvider',()=>({useTheme:()=>({theme:'light',setTheme:jest.fn()})}));
describe('intent exploration',()=>{
 it('shows honest routing and changes the canvas through intent and refinement',()=>{
  render(<IntentExplorer/>);
  expect(screen.getByText(/no live AI/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Career timeline'}));
  expect(screen.getByRole('heading',{name:'A career, in chapters.'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Community & NFTs'}));
  expect(screen.getByRole('heading',{name:'Art, autonomy & community'})).toBeInTheDocument();
  expect(screen.queryByRole('heading',{name:'PAST LIFE.'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Back'}));
  expect(screen.getByRole('heading',{name:'PAST LIFE.'})).toBeInTheDocument();
 });
 it('preserves a working view when a request is unsupported',()=>{
  render(<IntentExplorer/>);fireEvent.click(screen.getByRole('button',{name:'Listening path'}));
  fireEvent.change(screen.getByRole('textbox'),{target:{value:'Who is her manager?'}});
  fireEvent.click(screen.getByRole('button',{name:'Explore this intent'}));
  expect(screen.getByRole('alert')).toHaveTextContent('This prototype');
  expect(screen.getByRole('heading',{name:'Find your way into her sound.'})).toBeInTheDocument();
 });
 it('every item resolves to public evidence and unknown dates remain explicit',()=>{
  for(const item of [...timeline,...visualWorld]) expect(evidence.some(source=>source.id===item.evidenceId && source.url.startsWith('https://'))).toBe(true);
  expect(visualWorld.filter(item=>!item.date).every(item=>item.dateLabel==='Date not verified')).toBe(true);
 });
});
