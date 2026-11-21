import { render, screen } from '@testing-library/react';
import Page, { metadata } from '../page';

jest.mock('../ConnectedAgents', () => ({ __esModule: true, default: () => <p>connected agents</p> }));

it('keeps /oauth/connections out of search results', () => {
  expect(metadata.robots).toEqual({ index: false, follow: false });
  expect(metadata.title).toBe('Connected agents');
});

it('renders the connected agents', () => {
  render(<Page />);
  expect(screen.getByText('connected agents')).toBeInTheDocument();
});
