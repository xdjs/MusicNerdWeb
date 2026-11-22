import { fireEvent, render, screen } from '@testing-library/react';
import SignInCard from '../SignInCard';

const mockRequestLogin = jest.fn();
jest.mock('@/app/_components/nav/components/requestLogin', () => ({ requestLogin: (trigger: string) => mockRequestLogin(trigger) }));

it('explains why to log in and opens the login', () => {
  render(<SignInCard text="Log in to see it." note="Nothing is shared." />);
  expect(screen.getByText('Log in to see it.')).toBeInTheDocument();
  expect(screen.getByText('Nothing is shared.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(mockRequestLogin).toHaveBeenCalledWith('please_login');
});

it('leaves the note out when there is none', () => {
  const { container } = render(<SignInCard text="Log in to see it." />);
  expect(container.querySelectorAll('p')).toHaveLength(1);
});
