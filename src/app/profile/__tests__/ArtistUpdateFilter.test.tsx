import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ArtistUpdateFilter from '../ArtistUpdateFilter';
it('offers four groups and moves the selection with arrow keys and End', ()=>{
  Element.prototype.scrollIntoView=jest.fn();
  function Example(){const [value,setValue]=useState('All');return <ArtistUpdateFilter value={value} onValueChange={setValue}/>;}
  render(<Example/>);
  expect(screen.getAllByRole('button').map(button=>button.textContent)).toEqual(['All','Releases','Socials','Lore']);
  fireEvent.click(screen.getByRole('button',{name:'Socials'}));
  expect(screen.getByRole('button',{name:'Socials'})).toHaveAttribute('aria-pressed','true');
  fireEvent.keyDown(screen.getByRole('button',{name:'Socials'}),{key:'ArrowRight'});
  expect(screen.getByRole('button',{name:'Lore'})).toHaveAttribute('aria-pressed','true');
  fireEvent.keyDown(screen.getByRole('button',{name:'Lore'}),{key:'Home'});
  expect(screen.getByRole('button',{name:'All'})).toHaveAttribute('aria-pressed','true');
});
