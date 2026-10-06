import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AccessToken from '../AccessToken';

const mockGetAccessToken = jest.fn();
let mockPrivy = { ready: true, authenticated: true };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ ...mockPrivy, getAccessToken: mockGetAccessToken }) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const writeText = jest.fn();
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockPrivy = { ready: true, authenticated: true };
  mockGetAccessToken.mockResolvedValue('token-1');
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

const mount = () => render(<QueryClientProvider client={client}><AccessToken /></QueryClientProvider>);

it('shows a loading state until Privy is ready, without asking for a token', () => {
  mockPrivy = { ready: false, authenticated: false };
  mount();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(mockGetAccessToken).not.toHaveBeenCalled();
});

it('asks a signed-out reader to log in, without asking for a token', () => {
  mockPrivy = { ready: true, authenticated: false };
  mount();
  expect(screen.getByText(/Log in to see your access token/)).toBeInTheDocument();
  expect(mockGetAccessToken).not.toHaveBeenCalled();
});

it('shows the token in full for a signed-in reader', async () => {
  mount();
  expect(await screen.findByText('token-1')).toBeInTheDocument();
});

it('copies the token to the clipboard', async () => {
  mount();
  await screen.findByText('token-1');
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Copy token' })));
  expect(writeText).toHaveBeenCalledWith('token-1');
  expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
});

it('fetches a new token on refresh', async () => {
  mount();
  await screen.findByText('token-1');
  mockGetAccessToken.mockResolvedValue('token-2');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh token' }));
  expect(await screen.findByText('token-2')).toBeInTheDocument();
  expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
});

it('shows an error with a retry when Privy returns no token', async () => {
  mockGetAccessToken.mockResolvedValue(null);
  mount();
  expect(await screen.findByText('Could not get your access token.')).toBeInTheDocument();
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  mockGetAccessToken.mockResolvedValue('token-3');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('token-3')).toBeInTheDocument());
});
