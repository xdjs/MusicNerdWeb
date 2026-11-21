import { render, screen } from '@testing-library/react';
import Page, { metadata } from '../page';

jest.mock('../ConsentRequest', () => ({ __esModule: true, default: () => <p>consent request</p> }));

it('keeps /oauth/authorize out of search results', () => {
  expect(metadata.robots).toEqual({ index: false, follow: false });
  expect(metadata.title).toBe('Connect an agent');
});

it('renders the connection request', () => {
  render(<Page />);
  expect(screen.getByText('consent request')).toBeInTheDocument();
});
