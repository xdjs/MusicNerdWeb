import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";

const LABELS: Record<OnboardingStepName, string> = {
    profiles: "finding your profiles",
    vault: "reading what’s written about you",
    interview: "writing your about",
    publish: "writing your about",
};

/** What the status strip says the build is doing (docs/research-view.md). The
 *  auto-build confirms interview and publish together, so both read as the About. */
export function buildStepLabel(step: OnboardingStepName | null): string {
    return step ? LABELS[step] : "setting up your page";
}
