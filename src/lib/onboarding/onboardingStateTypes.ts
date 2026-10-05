/** The onboarding steps, in order, as MusicNerdAPI's
 *  GET /api/onboarding/{artistId}/state reports them (docs/research-view.md). */
export const ONBOARDING_STEP_NAMES = ["profiles", "vault", "interview", "publish"] as const;

export type OnboardingStepName = (typeof ONBOARDING_STEP_NAMES)[number];

/** Each step's confirmation time (ISO 8601, UTC), or null if it isn't confirmed. */
export type OnboardingSteps = Record<OnboardingStepName, string | null>;

/** The endpoint's 200 body, without `status`. */
export type OnboardingStateView = {
    complete: boolean;
    currentStep: OnboardingStepName | null;
    steps: OnboardingSteps;
};
