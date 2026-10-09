"use client";

import { useEffect, useRef } from "react";
import { isScrollKey } from "@/lib/onboarding/isScrollKey";
import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";
import { stepSection } from "@/lib/onboarding/stepSection";

/**
 * While research runs, scrolls to the section being researched each time the
 * step changes (docs/research-view.md, "Follow"), until the artist scrolls
 * themselves, and lands on About once more when the build completes: the
 * status card above it unmounts then, which would shift About under the
 * header. It listens for input (wheel, touch, scroll keys), not `scroll`
 * events, because its own smooth scrolling fires those too.
 */
export function useFollowResearch(currentStep: OnboardingStepName | null, complete: boolean, failed: boolean) {
    const brokeAway = useRef(false);

    useEffect(() => {
        const stop = () => { brokeAway.current = true; };
        const onKey = (e: KeyboardEvent) => { if (isScrollKey(e.key)) stop(); };
        window.addEventListener("wheel", stop, { passive: true });
        window.addEventListener("touchmove", stop, { passive: true });
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("wheel", stop);
            window.removeEventListener("touchmove", stop);
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    useEffect(() => {
        if (failed || brokeAway.current) return;
        const id = complete ? "mn-about" : stepSection(currentStep);
        if (!id) return;
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    }, [currentStep, complete, failed]);
}
