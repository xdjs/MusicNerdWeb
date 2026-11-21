import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConsentRequest from '../ConsentRequest';

let mockPrivy = { ready: true, authenticated: true };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => mockPrivy }));
const query = 'response_type=code&client_id=c1&redirect_uri=http%3A%2F%2F127.0.0.1%3A33418%2Fcallback&code_challenge=x&code_challenge_method=S256';
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));
const mockFetchConsentRequest = jest.fn();
jest.mock('@/lib/oauth/fetchConsentRequest', () => ({ fetchConsentRequest: (q: string) => mockFetchConsentRequest(q) }));
jest.mock('../ConsentPrompt', () => ({ __esModule: true, default: ({ query: q, request }: { query: string; request: { agent: string } }) => <p>prompt for {request.agent} with {q}</p> }));
const mockRequestLogin = jest.fn();
jest.mock('@/app/_components/nav/components/requestLogin', () => ({ requestLogin: (trigger: string) => mockRequestLogin(trigger) }));

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockPrivy = { ready: true, authenticated: true };
  mockFetchConsentRequest.mockResolvedValue({ status: 'ok', agent: 'Claude', redirectHost: '127.0.0.1:33418' });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

const mount = () => render(<QueryClientProvider client={client}><ConsentRequest /></QueryClientProvider>);

it('shows a loading state until Privy is ready, without reading the request', () => {
  mockPrivy = { ready: false, authenticated: false };
  mount();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(mockFetchConsentRequest).not.toHaveBeenCalled();
});

it('asks a signed-out member to log in first, without reading the request', () => {
  mockPrivy = { ready: true, authenticated: false };
  mount();
  expect(screen.getByRole('heading', { name: 'Log in to connect your agent' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
  expect(mockRequestLogin).toHaveBeenCalledWith('please_login');
  expect(mockFetchConsentRequest).not.toHaveBeenCalled();
});

it('reads the request with the same query and shows the prompt', async () => {
  mount();
  expect(screen.getByText('Checking the request…')).toBeInTheDocument();
  expect(await screen.findByText(`prompt for Claude with ${query}`)).toBeInTheDocument();
  expect(mockFetchConsentRequest).toHaveBeenCalledWith(query);
});

it('explains an invalid request with the API error', async () => {
  mockFetchConsentRequest.mockRejectedValue(new Error('Invalid authorization request'));
  mount();
  expect(await screen.findByText("This connection request can't be used")).toBeInTheDocument();
  expect(screen.getByText('Invalid authorization request')).toBeInTheDocument();
  expect(screen.getByText('Go back to your agent and connect again.')).toBeInTheDocument();
});
