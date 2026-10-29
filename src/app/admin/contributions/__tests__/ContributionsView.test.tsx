import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ContributionsView from '../ContributionsView';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { readAdminApi } from '@/lib/admin/readAdminApi';
import { mockMusicNerdUser } from '@/test/__mocks__/useMusicNerdUser';

const replace = jest.fn();
const notFound = jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); });
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }), notFound: () => notFound() }));
jest.mock('@/lib/admin/readAdminApi', () => ({ readAdminApi: jest.fn() }));
const workspace = jest.fn();
jest.mock('../ContributionWorkspace', () => function ContributionWorkspace(props: Record<string, unknown>) { workspace(props); return <p>Contributions</p>; });

const read = readAdminApi as jest.Mock;
const user = jest.mocked(useMusicNerdUser);
const signedIn = (isAdmin: boolean) => user.mockReturnValue({ user: { ...mockMusicNerdUser, isAdmin }, status: 'authenticated', isError: false, refetch: jest.fn() });
const path = '/api/admin/contributions?userId=u1&status=all';
const page = { status: 'ok', items: [], counts: {}, total: 0, page: 1, pageSize: 25, filters: { userId: 'u1', query: '', origin: '', type: '', status: 'all' }, account: { id: 'u1', username: null, email: 'fan@example.test' } };
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
const renderView = () => render(<QueryClientProvider client={client}><ContributionsView path={path} /></QueryClientProvider>);

it('renders one contributor\'s history from MusicNerdAPI for an admin', async () => {
  signedIn(true);
  read.mockResolvedValue(page);
  renderView();
  expect(await screen.findByText('Contributions')).toBeVisible();
  expect(read).toHaveBeenCalledWith(path);
  expect(workspace).toHaveBeenLastCalledWith({ data: expect.objectContaining({ userId: 'u1', status: 'all', account: page.account }), accountName: 'fan@example.test' });
});

it('sends a non-admin home without reading contributions', () => {
  signedIn(false);
  renderView();
  expect(replace).toHaveBeenCalledWith('/');
  expect(read).not.toHaveBeenCalled();
});

it('shows the not-found page for an unknown contributor', async () => {
  signedIn(true);
  read.mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  class Boundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
    state: { error?: Error } = {};
    static getDerivedStateFromError(error: Error) { return { error }; }
    render() { return this.state.error ? <p>{this.state.error.message}</p> : this.props.children; }
  }
  render(<QueryClientProvider client={client}><Boundary><ContributionsView path={path} /></Boundary></QueryClientProvider>);
  expect(await screen.findByText('NEXT_NOT_FOUND')).toBeVisible();
  expect(notFound).toHaveBeenCalled();
});
