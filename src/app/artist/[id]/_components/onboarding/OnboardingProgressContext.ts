"use client";

import { createContext } from "react";
import type { OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";
import type { FreshSections, SectionStep } from "./useFreshSections";

/** What the page knows while it watches a build (docs/research-view.md): each
 *  step's confirmation time, which sections just arrived, and the links and
 *  sources the page had when watching began (what counts as new). */
export type ResearchContextValue = {
    steps: OnboardingSteps;
    fresh: FreshSections;
    markSeen: (step: SectionStep) => void;
    baseline: { links: string[]; sources: string[] };
};

/** Null when no build is being watched. */
export const OnboardingProgressContext = createContext<ResearchContextValue | null>(null);
