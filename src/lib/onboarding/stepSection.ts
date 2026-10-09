import type { OnboardingStepName } from "./onboardingStateTypes";

/** The section a research step paints (docs/research-view.md, "Sections"),
 *  which the page follows while the build runs. */
export function stepSection(step: OnboardingStepName | null): "mn-links" | "mn-lore" | "mn-about" | null {
    if (step === "profiles") return "mn-links";
    if (step === "vault") return "mn-lore";
    if (step === "interview" || step === "publish") return "mn-about";
    return null;
}
