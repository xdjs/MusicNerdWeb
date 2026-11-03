import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArtistViewer } from '../useArtistViewer';
import { useMusicNerdUser } from '../useMusicNerdUser';
import { requestUserApi } from '@/lib/user/requestUserApi';
import { mockMusicNerdUser } from '@/test/__mocks__/useMusicNerdUser';

jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: jest.fn() }));
const request = requestUserApi as jest.Mock;
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it("reads the signed-in caller's claim and whether they added the artist", async () => {
  request.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok', claimStatus: 'pending', addedByCaller: true }) });
  const { result } = renderHook(() => useArtistViewer('artist-1'), { wrapper });
  await waitFor(() => expect(result.current.claimStatus).toBe('pending'));
  expect(result.current).toEqual({ user: mockMusicNerdUser, claimStatus: 'pending', addedByCaller: true });
  expect(request).toHaveBeenCalledWith('/api/artist/artist-1/viewer', expect.objectContaining({ signal: expect.anything() }));
});

it('makes no request for a visitor', () => {
  jest.mocked(useMusicNerdUser).mockReturnValueOnce({ user: null, status: 'unauthenticated', isError: false, refetch: jest.fn() });
  const { result } = renderHook(() => useArtistViewer('artist-1'), { wrapper });
  expect(result.current).toEqual({ user: null, claimStatus: null, addedByCaller: false });
  expect(request).not.toHaveBeenCalled();
});

it('treats an unreadable relation as none', async () => {
  request.mockResolvedValue({ ok: false, status: 500 });
  const { result } = renderHook(() => useArtistViewer('artist-1'), { wrapper });
  await waitFor(() => expect(request).toHaveBeenCalled());
  expect(result.current).toMatchObject({ claimStatus: null, addedByCaller: false });
});
