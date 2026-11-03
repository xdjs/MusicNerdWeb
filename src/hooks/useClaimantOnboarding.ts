"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOnboardingState } from "@/lib/onboarding/fetchOnboardingState";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";

/**
 * The approved claimant's onboarding state, read once from MusicNerdAPI
 * (docs/research-view.md). Null when it isn't read or can't be: callers render
 * no takeover (fail closed), never a "not started" state.
 *
 * @param artistId - The artist.
 * @param enabled - True only for the artist's approved claimant.
 * @returns The state, or null.
 */
export function useClaimantOnboarding(artistId: string, enabled: boolean): OnboardingStateView | null {
  const query = useQuery({
    queryKey: ["claimantOnboarding", artistId],
    queryFn: () => fetchOnboardingState(artistId),
    enabled,
    staleTime: Infinity,
  });
  return enabled ? query.data ?? null : null;
}
