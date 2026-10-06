"use client";

import { createContext } from "react";
import type { OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";

/** Each onboarding step's confirmation time while the page watches a build
 *  (docs/research-view.md); null when no build is being watched. */
export const OnboardingProgressContext = createContext<OnboardingSteps | null>(null);
