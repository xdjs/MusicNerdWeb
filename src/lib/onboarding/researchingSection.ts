import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";

/** The section research is filling now (docs/research-view.md, "Sections"). The
 *  auto-build confirms interview with publish, so a current `interview` is the About. */
export function researchingSection(currentStep: OnboardingStepName | null): "profiles" | "vault" | "publish" | null {
    return currentStep === "interview" ? "publish" : currentStep;
}
