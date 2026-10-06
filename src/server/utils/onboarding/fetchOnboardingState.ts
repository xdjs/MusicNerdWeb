import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";

/** How long the page waits for the state before rendering without the takeover. */
const TIMEOUT_MS = 5_000;

/**
 * The claimant's onboarding state, from MusicNerdAPI's
 * GET /api/onboarding/{artistId}/state (docs/research-view.md). Null means
 * the state couldn't be read: callers render no takeover (fail closed), never
 * a "not started" state.
 *
 * @param artistId - The artist.
 * @returns `{ complete, currentStep, steps }`, or null.
 */
export async function fetchOnboardingState(artistId: string): Promise<OnboardingStateView | null> {
    try {
        const res = await fetch(musicNerdApiUrl(`/api/onboarding/${artistId}/state`), {
            cache: "no-store",
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return null;
        const { complete, currentStep, steps } = await res.json();
        return { complete, currentStep, steps };
    } catch (e) {
        console.error("[fetchOnboardingState] Error:", e);
        return null;
    }
}
