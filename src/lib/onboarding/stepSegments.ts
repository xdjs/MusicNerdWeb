import type { OnboardingStepName, OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";

export type StepSegment = { label: "Links" | "Lore" | "About"; state: "done" | "active" | "waiting" };

const SEGMENTS: { label: StepSegment["label"]; step: OnboardingStepName }[] = [
    { label: "Links", step: "profiles" },
    { label: "Lore", step: "vault" },
    { label: "About", step: "publish" },
];

/** The status card's three segments (docs/research-view.md, "Status card"). The
 *  auto-build confirms interview with publish, so a current `interview` is the About. */
export function stepSegments(steps: OnboardingSteps, currentStep: OnboardingStepName | null): StepSegment[] {
    const current = currentStep === "interview" ? "publish" : currentStep;
    return SEGMENTS.map(({ label, step }) => ({
        label,
        state: steps[step] !== null ? "done" : step === current ? "active" : "waiting",
    }));
}
