import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArtistEditor } from '../useArtistEditor';
import { requestUserApi } from '@/lib/user/requestUserApi';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('reads the stored About and every approved and pending source for an editor', async () => {
  const body = { status: 'ok', bio: 'Stored About', approvedSources: [{ id: 'a', contributorName: 'Otter' }], pendingSources: [{ id: 'p' }] };
  request.mockResolvedValue({ ok: true, json: async () => body });
  const { result } = renderHook(() => useArtistEditor('artist-1', true), { wrapper });
  await waitFor(() => expect(result.current).not.toBeNull());
  expect(result.current).toEqual({ bio: 'Stored About', approvedSources: body.approvedSources, pendingSources: body.pendingSources });
  expect(request).toHaveBeenCalledWith('/api/artist/artist-1/editor', expect.objectContaining({ signal: expect.anything() }));
});

it('makes no request for anyone but an editor', () => {
  const { result } = renderHook(() => useArtistEditor('artist-1', false), { wrapper });
  expect(result.current).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

it('stays null when the editor view cannot be read', async () => {
  request.mockResolvedValue({ ok: false, status: 403 });
  const { result } = renderHook(() => useArtistEditor('artist-1', true), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(result.current).toBeNull();
});
