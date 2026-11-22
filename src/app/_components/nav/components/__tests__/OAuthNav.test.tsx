import { render, screen } from '@testing-library/react';
import OAuthNav from '../OAuthNav';

jest.mock('../Login', () => ({ __esModule: true, default: () => <button id="login-btn">Log In</button> }));

it('shows the wordmark and a way back to Music Nerd', () => {
  render(<OAuthNav />);
  expect(screen.getByRole('link', { name: 'music nerd' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Back to Music Nerd' })).toHaveAttribute('href', '/');
});

it('keeps the login button mounted but hidden, so the pages can open Privy', () => {
  const { container } = render(<OAuthNav />);
  const login = container.querySelector('#login-btn');
  expect(login).not.toBeNull();
  expect(login!.parentElement).toHaveAttribute('hidden');
});
