import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccessToken } from '../useAccessToken';

const mockGetAccessToken = jest.fn();
let mockPrivy = { ready: true, authenticated: true };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => ({ ...mockPrivy, getAccessToken: mockGetAccessToken }) }));
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockPrivy = { ready: true, authenticated: true };
  mockGetAccessToken.mockResolvedValue('token-1');
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { client.clear(); jest.restoreAllMocks(); });

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('returns the signed-in user\'s token', async () => {
  const { result } = renderHook(() => useAccessToken(), { wrapper });
  await waitFor(() => expect(result.current.accessToken).toBe('token-1'));
  expect(result.current).toEqual(expect.objectContaining({ ready: true, authenticated: true }));
});

it.each([
  ['Privy is not ready', { ready: false, authenticated: false }],
  ['the reader is signed out', { ready: true, authenticated: false }],
])('does not ask for a token while %s', (_label, privy) => {
  mockPrivy = privy;
  const { result } = renderHook(() => useAccessToken(), { wrapper });
  expect(mockGetAccessToken).not.toHaveBeenCalled();
  expect(result.current.accessToken).toBeUndefined();
});

it('refetch asks Privy again', async () => {
  const { result } = renderHook(() => useAccessToken(), { wrapper });
  await waitFor(() => expect(result.current.accessToken).toBe('token-1'));
  mockGetAccessToken.mockResolvedValue('token-2');
  await result.current.refetch();
  await waitFor(() => expect(result.current.accessToken).toBe('token-2'));
});

it('fails and toasts when Privy returns no token', async () => {
  mockGetAccessToken.mockResolvedValue(null);
  const { result } = renderHook(() => useAccessToken(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
});
