import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const { useMusicNerdUser } = jest.requireActual<typeof import('../useMusicNerdUser')>('../useMusicNerdUser');

let mockPrivy = { ready: true, authenticated: true, user: { id: 'did:privy:x' } as { id: string } | null };
jest.mock('@privy-io/react-auth', () => ({ usePrivy: () => mockPrivy }));
const mockRequestUserApi = jest.fn();
jest.mock('@/lib/user/requestUserApi', () => ({ requestUserApi: (...args: unknown[]) => mockRequestUserApi(...args) }));

const account = { status: 'ok', id: 'u1', username: 'Vinyl Otter', isAdmin: true, needsLegacyLink: false };
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  mockPrivy = { ready: true, authenticated: true, user: { id: 'did:privy:x' } };
  mockRequestUserApi.mockResolvedValue(ok(account));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it('reads the signed-in caller from MusicNerdAPI', async () => {
  const { result } = renderHook(() => useMusicNerdUser(), { wrapper });
  expect(result.current.status).toBe('loading');
  await waitFor(() => expect(result.current.status).toBe('authenticated'));
  expect(result.current.user).toEqual(account);
  expect(mockRequestUserApi).toHaveBeenCalledWith('/api/user/me', expect.objectContaining({ signal: expect.anything() }));
});

it('is loading until Privy is ready', () => {
  mockPrivy = { ready: false, authenticated: false, user: null };
  const { result } = renderHook(() => useMusicNerdUser(), { wrapper });
  expect(result.current).toEqual(expect.objectContaining({ status: 'loading', user: null }));
  expect(mockRequestUserApi).not.toHaveBeenCalled();
});

it('is unauthenticated, without a request, when signed out of Privy', () => {
  mockPrivy = { ready: true, authenticated: false, user: null };
  const { result } = renderHook(() => useMusicNerdUser(), { wrapper });
  expect(result.current).toEqual(expect.objectContaining({ status: 'unauthenticated', user: null }));
  expect(mockRequestUserApi).not.toHaveBeenCalled();
});

it('is unauthenticated with isError when the API rejects the caller', async () => {
  mockRequestUserApi.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  const { result } = renderHook(() => useMusicNerdUser(), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current).toEqual(expect.objectContaining({ status: 'unauthenticated', user: null }));
});

it('shares one request between components and refetch reads again', async () => {
  const { result } = renderHook(() => [useMusicNerdUser(), useMusicNerdUser()], { wrapper });
  await waitFor(() => expect(result.current[0].status).toBe('authenticated'));
  expect(mockRequestUserApi).toHaveBeenCalledTimes(1);
  mockRequestUserApi.mockResolvedValue(ok({ ...account, username: 'Tape Moth' }));
  await result.current[1].refetch();
  await waitFor(() => expect(result.current[0].user?.username).toBe('Tape Moth'));
});
