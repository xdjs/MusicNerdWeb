import { render, screen } from '@testing-library/react';
import { Music } from 'lucide-react';
import Permission from '../Permission';

it('shows what the agent can do, with a badge when given', () => {
  render(<Permission icon={Music} title="Read Music Nerd" badge="Team only" text="Look up artists." />);
  expect(screen.getByText('Read Music Nerd')).toBeInTheDocument();
  expect(screen.getByText('Team only')).toBeInTheDocument();
  expect(screen.getByText('Look up artists.')).toBeInTheDocument();
});
