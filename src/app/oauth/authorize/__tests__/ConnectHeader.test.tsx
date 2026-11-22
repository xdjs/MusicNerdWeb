import { render, screen } from '@testing-library/react';
import ConnectHeader from '../ConnectHeader';

it('names the agent asking to use Music Nerd', () => {
  render(<ConnectHeader agent="Claude" />);
  expect(screen.getByRole('heading', { level: 1, name: 'Claude wants to use music nerd' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Music Nerd' })).toBeInTheDocument();
});
