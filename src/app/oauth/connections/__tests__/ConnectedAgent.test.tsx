import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConnectedAgent from '../ConnectedAgent';
import { formatClaimDate } from '@/lib/claims/formatClaimDate';
import type { OAuthConnection } from '@/lib/oauth/types';

const mockDisconnect = jest.fn();
jest.mock('@/lib/oauth/disconnectConnection', () => ({ disconnectConnection: (id: string) => mockDisconnect(id) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

// Testing Library collapses the no-break space formatClaimDate puts before AM/PM.
const date = (iso: string) => formatClaimDate(iso).replace(/\s+/g, " ");
const connection: OAuthConnection = { id: 'conn_1', agent: 'Claude', scopes: ['mcp:tools'], connectedAt: '2026-11-20T18:02:11.000Z', lastUsedAt: '2026-11-20T19:40:05.000Z' };
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient(); });

const mount = (c = connection) => render(<QueryClientProvider client={client}><ul><ConnectedAgent connection={c} /></ul></QueryClientProvider>);

it('shows the agent, when it connected and when it was last used', () => {
  mount();
  expect(screen.getByText('Claude')).toBeInTheDocument();
  expect(screen.getByText(`Connected ${date(connection.connectedAt)}`)).toBeInTheDocument();
  expect(screen.getByText(`Last used ${date(connection.lastUsedAt!)}`)).toBeInTheDocument();
});

it('says when the agent has not been used yet', () => {
  mount({ ...connection, lastUsedAt: null });
  expect(screen.getByText('Not used yet')).toBeInTheDocument();
});

it('disconnects the agent and refreshes the list', async () => {
  mockDisconnect.mockResolvedValue(undefined);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  mount();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Disconnect Claude' })));
  expect(mockDisconnect).toHaveBeenCalledWith('conn_1');
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['oauthConnections'] });
});

it('reports a failed disconnect and keeps the button usable', async () => {
  mockDisconnect.mockRejectedValue(new Error('Not signed in'));
  mount();
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Disconnect Claude' })));
  expect(mockToast).toHaveBeenCalledWith({ title: 'Could not disconnect Claude', description: 'Not signed in', variant: 'destructive' });
  expect(screen.getByRole('button', { name: 'Disconnect Claude' })).toBeEnabled();
});
