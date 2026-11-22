import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConnectedAgent from '../ConnectedAgent';
import { formatShortDate } from '@/lib/oauth/formatShortDate';
import type { OAuthConnection } from '@/lib/oauth/types';

const mockDisconnect = jest.fn();
jest.mock('@/lib/oauth/disconnectConnection', () => ({ disconnectConnection: (id: string) => mockDisconnect(id) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const connection: OAuthConnection = { id: 'conn_1', agent: 'Claude', scopes: ['mcp:tools'], connectedAt: '2026-11-20T18:02:11.000Z', lastUsedAt: null };
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient(); });

const mount = (c = connection) => render(<QueryClientProvider client={client}><ul><ConnectedAgent connection={c} /></ul></QueryClientProvider>);
const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Disconnect Claude' }));

it('shows the agent, when it connected, when it was last used and its access', () => {
  mount();
  expect(screen.getByText('Claude')).toBeInTheDocument();
  expect(screen.getByText(`Connected ${formatShortDate(connection.connectedAt)} · Not used yet`)).toBeInTheDocument();
  expect(screen.getByText('Read Music Nerd')).toBeInTheDocument();
});

it('shows an unknown scope as it is', () => {
  mount({ ...connection, scopes: ['other:scope'] });
  expect(screen.getByText('other:scope')).toBeInTheDocument();
});

it('asks once before disconnecting, and Keep leaves the agent connected', () => {
  mount();
  confirm();
  expect(screen.getByText('Disconnect Claude? It stops working at once. You can connect it again any time.')).toBeInTheDocument();
  expect(mockDisconnect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
  expect(screen.queryByText(/It stops working at once/)).not.toBeInTheDocument();
  expect(mockDisconnect).not.toHaveBeenCalled();
});

it('disconnects the agent on confirm and refreshes the list', async () => {
  mockDisconnect.mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  mount();
  confirm();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Claude' })));
  expect(mockDisconnect).toHaveBeenCalledWith('conn_1');
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['oauthConnections'] });
});

it('reports a failed disconnect and keeps the confirm usable', async () => {
  mockDisconnect.mockRejectedValue(new Error('Not signed in'));
  mount();
  confirm();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Confirm disconnect Claude' })));
  expect(mockToast).toHaveBeenCalledWith({ title: 'Could not disconnect Claude', description: 'Not signed in', variant: 'destructive' });
  expect(screen.getByRole('button', { name: 'Confirm disconnect Claude' })).toBeEnabled();
});
