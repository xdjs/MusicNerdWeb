import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConsentPrompt from '../ConsentPrompt';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
const mockDecideConsent = jest.fn();
jest.mock('@/lib/oauth/decideConsent', () => ({ decideConsent: (q: string, d: string) => mockDecideConsent(q, d) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ user: { email: { address: 'privy@example.com' } } }), useLogout: () => ({ logout: jest.fn() }) }));
jest.mock('@/hooks/useMusicNerdUser', () => ({ useMusicNerdUser: () => ({ user: { username: 'Sweetman', email: 'member@example.com' } }) }));

const request = { status: 'ok' as const, agent: 'Claude', redirectHost: '127.0.0.1:33418' };
beforeEach(() => jest.clearAllMocks());

const mount = () => render(<ConsentPrompt query="client_id=c1" request={request} />);

it('names the agent, who is signed in, what it can do and where the member goes back to', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Claude wants to use music nerd' })).toBeInTheDocument();
  expect(screen.getByText('Sweetman')).toBeInTheDocument();
  expect(screen.getByText('member@example.com')).toBeInTheDocument();
  expect(screen.getByText('Read Music Nerd')).toBeInTheDocument();
  expect(screen.getByText('Post on the team board')).toBeInTheDocument();
  expect(screen.getByText('Read channels and threads, post and reply as Claude for Sweetman.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Connected agents' })).toHaveAttribute('href', '/oauth/connections');
  expect(screen.getByText('The agent chose its own name')).toBeInTheDocument();
  expect(screen.getByText('127.0.0.1:33418')).toBeInTheDocument();
});

it('approves and follows the URL the API returned', async () => {
  mockDecideConsent.mockResolvedValue('http://127.0.0.1:33418/callback?code=c');
  mount();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Approve' })));
  expect(mockDecideConsent).toHaveBeenCalledWith('client_id=c1', 'approve');
  expect(mockReplace).toHaveBeenCalledWith('http://127.0.0.1:33418/callback?code=c');
});

it('denies and follows the URL the API returned', async () => {
  mockDecideConsent.mockResolvedValue('http://127.0.0.1:33418/callback?error=access_denied');
  mount();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Deny' })));
  expect(mockDecideConsent).toHaveBeenCalledWith('client_id=c1', 'deny');
  expect(mockReplace).toHaveBeenCalledWith('http://127.0.0.1:33418/callback?error=access_denied');
});

it('disables both buttons while the decision is sent', async () => {
  mockDecideConsent.mockReturnValue(new Promise(() => {}));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled());
  expect(screen.getByRole('button', { name: 'Deny' })).toBeDisabled();
});

it('reports a refused decision, stays on the page and lets the member try again', async () => {
  mockDecideConsent.mockRejectedValue(new Error('Not signed in'));
  mount();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Approve' })));
  expect(mockToast).toHaveBeenCalledWith({ title: 'Could not connect the agent', description: 'Not signed in', variant: 'destructive' });
  expect(mockReplace).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
});
