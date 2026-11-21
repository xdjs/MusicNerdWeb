import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConsentPrompt from '../ConsentPrompt';

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
const mockDecideConsent = jest.fn();
jest.mock('@/lib/oauth/decideConsent', () => ({ decideConsent: (q: string, d: string) => mockDecideConsent(q, d) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const request = { status: 'ok' as const, agent: 'Claude', redirectHost: '127.0.0.1:33418' };
beforeEach(() => jest.clearAllMocks());

const mount = () => render(<ConsentPrompt query="client_id=c1" request={request} />);

it('names the agent, what it gets and where the member goes back to', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Claude wants to connect to Music Nerd' })).toBeInTheDocument();
  expect(screen.getByText(/use Music Nerd's tools as you/)).toBeInTheDocument();
  expect(screen.getByText('127.0.0.1:33418')).toBeInTheDocument();
  expect(screen.getByText(/The agent chose its own name/)).toBeInTheDocument();
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
