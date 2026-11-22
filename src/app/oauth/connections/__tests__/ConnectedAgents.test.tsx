import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConnectedAgents from '../ConnectedAgents';

let mockPrivy: { ready: boolean; authenticated: boolean; user?: unknown } = { ready: true, authenticated: true };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => mockPrivy }));
jest.mock('@/hooks/useMusicNerdUser', () => ({ useMusicNerdUser: () => ({ user: { username: 'Sweetman', email: 'member@example.com' } }) }));
const mockFetchConnections = jest.fn();
jest.mock('@/lib/oauth/fetchConnections', () => ({ fetchConnections: () => mockFetchConnections() }));
jest.mock('../ConnectedAgent', () => ({ __esModule: true, default: ({ connection }: { connection: { agent: string } }) => <li>{connection.agent}</li> }));
const mockRequestLogin = jest.fn();
jest.mock('@/app/_components/nav/components/requestLogin', () => ({ requestLogin: (trigger: string) => mockRequestLogin(trigger) }));

const connection = (id: string, agent: string) => ({ id, agent, scopes: ['mcp:tools'], connectedAt: '2026-11-20T18:02:11.000Z', lastUsedAt: null });
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockPrivy = { ready: true, authenticated: true };
  mockFetchConnections.mockResolvedValue([connection('a', 'Claude'), connection('b', 'Cursor')]);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

const mount = () => render(<QueryClientProvider client={client}><ConnectedAgents /></QueryClientProvider>);

it('shows a loading state until Privy is ready, without listing', () => {
  mockPrivy = { ready: false, authenticated: false };
  mount();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(mockFetchConnections).not.toHaveBeenCalled();
});

it('asks a signed-out member to log in, without listing', () => {
  mockPrivy = { ready: true, authenticated: false };
  mount();
  expect(screen.getByRole('heading', { name: 'Connected agents' })).toBeInTheDocument();
  expect(screen.getByText('Log in with your Music Nerd email to see your connected agents.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(mockRequestLogin).toHaveBeenCalledWith('please_login');
  expect(mockFetchConnections).not.toHaveBeenCalled();
});

it("lists the member's connected agents", async () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Connected agents' })).toBeInTheDocument();
  expect(screen.getByText('Loading connected agents…')).toBeInTheDocument();
  expect(await screen.findByText('Claude')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Claude', 'Cursor']);
  expect(screen.getByText('member@example.com')).toBeInTheDocument();
  expect(screen.getByText('https://musicnerd-api-staging.vercel.app/mcp')).toBeInTheDocument();
});

it('reads the list again on Refresh', async () => {
  mount();
  expect(await screen.findByText('Claude')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await waitFor(() => expect(mockFetchConnections).toHaveBeenCalledTimes(2));
});

it('says when no agent is connected', async () => {
  mockFetchConnections.mockResolvedValue([]);
  mount();
  expect(await screen.findByText('No agents connected yet.')).toBeInTheDocument();
});

it('shows an error with a retry when the list fails', async () => {
  mockFetchConnections.mockRejectedValueOnce(new Error('Not signed in'));
  mount();
  expect(await screen.findByText('Could not load your connected agents.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Claude')).toBeInTheDocument();
});
