import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClaimantOnboarding } from '../useClaimantOnboarding';
import { fetchOnboardingState } from '@/lib/onboarding/fetchOnboardingState';

jest.mock('@/lib/onboarding/fetchOnboardingState', () => ({ fetchOnboardingState: jest.fn() }));
const fetchState = fetchOnboardingState as jest.Mock;
let client: QueryClient;
beforeEach(() => { jest.clearAllMocks(); client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); });
afterEach(() => client.clear());
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

it("reads the claimant's onboarding state", async () => {
  const state = { complete: false, currentStep: 'vault', steps: {} };
  fetchState.mockResolvedValue(state);
  const { result } = renderHook(() => useClaimantOnboarding('artist-1', true), { wrapper });
  await waitFor(() => expect(result.current).toEqual(state));
  expect(fetchState).toHaveBeenCalledWith('artist-1');
});

it('reads nothing for anyone but the approved claimant', () => {
  const { result } = renderHook(() => useClaimantOnboarding('artist-1', false), { wrapper });
  expect(result.current).toBeNull();
  expect(fetchState).not.toHaveBeenCalled();
});
