import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminQuery } from '../useAdminQuery';
import { readAdminApi } from '@/lib/admin/readAdminApi';

jest.mock('@/lib/admin/readAdminApi', () => ({ readAdminApi: jest.fn() }));
const read = readAdminApi as jest.Mock;
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('reads the admin path', async () => {
  read.mockResolvedValue({ users: [] });
  const { result } = renderHook(() => useAdminQuery('/api/admin/users', true), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual({ users: [] }));
  expect(read).toHaveBeenCalledWith('/api/admin/users');
});

it('waits until the caller is an admin', () => {
  renderHook(() => useAdminQuery('/api/admin/users', false), { wrapper });
  expect(read).not.toHaveBeenCalled();
});

it('keeps the previous page while the next one loads', async () => {
  read.mockResolvedValueOnce({ page: 1 });
  const { result, rerender } = renderHook(({ path }) => useAdminQuery(path, true), { wrapper, initialProps: { path: '/api/admin/activity' } });
  await waitFor(() => expect(result.current.data).toEqual({ page: 1 }));
  read.mockReturnValueOnce(new Promise(() => {}));
  rerender({ path: '/api/admin/activity?page=2' });
  expect(result.current.data).toEqual({ page: 1 });
});
