import { fireEvent, render, screen } from '@testing-library/react';
import PleaseLoginPage from '@/app/_components/PleaseLoginPage';

const mockRequestLogin = jest.fn();
jest.mock('@/app/_components/nav/components/requestLogin', () => ({ requestLogin: (trigger: string) => mockRequestLogin(trigger) }));

it('uses the theme text colour, so the heading reads in dark mode too', () => {
  render(<PleaseLoginPage text="Log in to see your access token" />);
  expect(screen.getByRole('heading', { name: 'Log in to see your access token' }).closest('section')).toHaveClass('text-foreground');
});

it('opens the login from its button', () => {
  render(<PleaseLoginPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
  expect(mockRequestLogin).toHaveBeenCalledWith('please_login');
});
