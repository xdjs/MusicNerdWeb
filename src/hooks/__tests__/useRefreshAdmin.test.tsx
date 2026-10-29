import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdminQuery } from '../useAdminQuery';
import { useRefreshAdmin } from '../useRefreshAdmin';
import { readAdminApi } from '@/lib/admin/readAdminApi';

jest.mock('@/lib/admin/readAdminApi', () => ({ readAdminApi: jest.fn() }));
const read = readAdminApi as jest.Mock;
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('reads the admin data again', async () => {
  read.mockResolvedValueOnce({ users: ['a'] }).mockResolvedValueOnce({ users: ['a', 'b'] });
  const { result } = renderHook(() => ({ query: useAdminQuery('/api/admin/users', true), refresh: useRefreshAdmin() }), { wrapper });
  await waitFor(() => expect(result.current.query.data).toEqual({ users: ['a'] }));
  await act(() => result.current.refresh());
  await waitFor(() => expect(result.current.query.data).toEqual({ users: ['a', 'b'] }));
  expect(read).toHaveBeenCalledTimes(2);
});
