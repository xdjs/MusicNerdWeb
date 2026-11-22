import { act, fireEvent, render, screen } from '@testing-library/react';
import AccountCard from '../AccountCard';

const mockLogout = jest.fn();
jest.mock('@privy-io/react-auth', () => ({ useLogout: () => ({ logout: mockLogout }) }));
const mockSignOut = jest.fn();
jest.mock('@/app/_components/nav/components/signOutEverywhere', () => ({ signOutEverywhere: (l: unknown) => mockSignOut(l) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
beforeEach(() => jest.clearAllMocks());

const member = { name: 'Sweetman', email: 'member@example.com', initial: 'S' };

it('shows who is signed in', () => {
  render(<AccountCard member={member} />);
  expect(screen.getByText('Sweetman')).toBeInTheDocument();
  expect(screen.getByText('member@example.com')).toBeInTheDocument();
  expect(screen.getByText('S')).toBeInTheDocument();
});

it('leaves the email line out when there is none', () => {
  render(<AccountCard member={{ name: 'member@example.com', email: null, initial: 'M' }} />);
  expect(screen.getAllByText('member@example.com')).toHaveLength(1);
});

it('signs out to switch account', async () => {
  mockSignOut.mockResolvedValue(undefined);
  render(<AccountCard member={member} />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Switch account' })));
  expect(mockSignOut).toHaveBeenCalledWith(mockLogout);
});

it('reports a failed sign-out', async () => {
  mockSignOut.mockRejectedValue(new Error('offline'));
  render(<AccountCard member={member} />);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Switch account' })));
  expect(mockToast).toHaveBeenCalledWith({ title: 'Could not switch account', description: 'offline', variant: 'destructive' });
});
