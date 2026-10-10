import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";
import { stepSection } from "@/lib/onboarding/stepSection";

/**
 * Scrolls once to the section a research step paints, when the artist asks
 * for it from the progress pill (docs/research-view.md, "Nothing scrolls by
 * itself"). Smooth, or a jump with reduced motion.
 */
export function showResearchSection(step: OnboardingStepName | null) {
    const id = stepSection(step);
    if (!id) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
}
