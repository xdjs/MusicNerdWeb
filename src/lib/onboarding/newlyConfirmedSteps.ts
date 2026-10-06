import { ONBOARDING_STEP_NAMES, type OnboardingStepName, type OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";

/** The steps confirmed in `next` that weren't in `prev`, in step order: each
 *  is a section ready to repaint (docs/research-view.md, "Progress"). */
export function newlyConfirmedSteps(prev: OnboardingSteps, next: OnboardingSteps): OnboardingStepName[] {
    return ONBOARDING_STEP_NAMES.filter(step => prev[step] === null && next[step] !== null);
}
