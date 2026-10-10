import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";
import { stepSection } from "@/lib/onboarding/stepSection";

/**
 * Scrolls once to the section a research step paints, when the artist asks
 * for it from the progress pill (docs/research-view.md, "Nothing scrolls by
 * itself"). About sits in the hero, so it goes to the top of the page, where
 * the header shows with it. Smooth, or a jump with reduced motion.
 */
export function showResearchSection(step: OnboardingStepName | null) {
    const id = stepSection(step);
    if (!id) return;
    const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (id === "mn-about") window.scrollTo({ top: 0, behavior });
    else document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
}
