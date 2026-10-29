import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminView from '../AdminView';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { readAdminApi } from '@/lib/admin/readAdminApi';
import { mockMusicNerdUser } from '@/test/__mocks__/useMusicNerdUser';

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
jest.mock('@/lib/admin/readAdminApi', () => ({ readAdminApi: jest.fn() }));
const dashboard = jest.fn();
jest.mock('../AdminDashboard', () => function AdminDashboard(props: Record<string, unknown>) { dashboard(props); return <p>Admin dashboard</p>; });
jest.mock('../ArtistActivitySection', () => function ArtistActivitySection({ data }: { data: unknown }) { return <pre data-testid="activity">{JSON.stringify(data)}</pre>; });

const read = readAdminApi as jest.Mock;
const user = jest.mocked(useMusicNerdUser);
const signedIn = (isAdmin: boolean) => user.mockReturnValue({ user: { ...mockMusicNerdUser, isAdmin }, status: 'authenticated', isError: false, refetch: jest.fn() });
const responses: Record<string, unknown> = {
  '/api/admin/review-queue?type=all': { status: 'ok', items: [], counts: { links: 0, sources: 0, corrections: 0 }, pendingCounts: { links: 1, sources: 2, corrections: 3 }, total: 0, page: 1, pageSize: 25, filters: { type: 'all', query: '' } },
  '/api/admin/activity?page=2': { status: 'ok', items: [], total: 0, page: 1, pageSize: 25, filters: { query: '', action: '', eventId: '' } },
  '/api/admin/users': { status: 'ok', users: [{ id: 'u1' }] },
  '/api/admin/claims': { status: 'ok', claims: [{ id: 'c1', userId: 'u2', artistName: null, status: 'pending' }] },
  '/api/admin/mcp-keys': [{ id: 'k1' }],
};
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  read.mockImplementation(async (path: string) => responses[path]);
});
afterEach(() => client.clear());
const renderView = () => render(<QueryClientProvider client={client}>
  <AdminView initialSection="lore" reviewPath="/api/admin/review-queue?type=all" activityPath="/api/admin/activity?page=2" />
</QueryClientProvider>);

it('renders the dashboard from MusicNerdAPI for an admin', async () => {
  signedIn(true);
  renderView();
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(await screen.findByText('Admin dashboard')).toBeVisible();
  const props = dashboard.mock.calls.at(-1)[0];
  expect(props).toMatchObject({
    reviews: { type: 'all', query: '', pendingCounts: { links: 1, sources: 2, corrections: 3 } },
    allUsers: [{ id: 'u1' }],
    mcpKeys: [{ id: 'k1' }],
    allClaims: [{ id: 'c1', artistName: 'Unknown Artist', status: 'pending' }],
    initialSection: 'lore',
  });
  expect(props.reviews).not.toHaveProperty('filters');
  render(props.activityContent);
  expect(screen.getByTestId('activity')).toHaveTextContent('"eventId":""');
  expect(replace).not.toHaveBeenCalled();
});

it.each([
  ['a signed-out visitor', () => user.mockReturnValue({ user: null, status: 'unauthenticated', isError: false, refetch: jest.fn() })],
  ['a signed-in non-admin', () => signedIn(false)],
])('sends %s home without reading admin data', (_label, setup) => {
  setup();
  renderView();
  expect(replace).toHaveBeenCalledWith('/');
  expect(read).not.toHaveBeenCalled();
});

it('waits for the account before deciding', () => {
  user.mockReturnValue({ user: null, status: 'loading', isError: false, refetch: jest.fn() });
  renderView();
  expect(replace).not.toHaveBeenCalled();
  expect(read).not.toHaveBeenCalled();
});

it('says when the admin data cannot be read', async () => {
  signedIn(true);
  read.mockRejectedValue(Object.assign(new Error('nope'), { status: 500 }));
  renderView();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load the admin dashboard'));
});
