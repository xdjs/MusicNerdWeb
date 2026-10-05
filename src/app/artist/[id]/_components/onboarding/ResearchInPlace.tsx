"use client";

import type { ReactNode } from "react";
import type { BuildItem } from "@/lib/onboarding/buildStages";
import { buildFailure } from "@/lib/onboarding/buildFailure";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";
import { OnboardingProgressContext } from "./OnboardingProgressContext";
import ResearchStatusBar from "./ResearchStatusBar";
import { useOnboardingProgress } from "./useOnboardingProgress";

const STALLED = "This is taking longer than usual.";

/**
 * The artist's own page while research builds it (docs/research-view.md): the
 * status strip over the page, and each research section's loading state from
 * the confirmed steps. Mounted only during the build, so the step-cards resume
 * path never polls.
 */
export default function ResearchInPlace({ artistId, initialState, items, onSkip, onRetry, onComplete, children }: {
    artistId: string;
    initialState: OnboardingStateView;
    items: BuildItem[];
    onSkip: () => void;
    onRetry: () => void;
    onComplete: () => void;
    children?: ReactNode;
}) {
    const progress = useOnboardingProgress(artistId, initialState, onComplete);
    const failure = buildFailure(items)?.message ?? (progress.stalled ? STALLED : null);
    return (
        <OnboardingProgressContext.Provider value={progress.steps}>
            <ResearchStatusBar
                step={progress.currentStep}
                failure={failure}
                onSkip={onSkip}
                onRetry={() => {
                    progress.resetStall();
                    onRetry();
                }}
            />
            {children}
        </OnboardingProgressContext.Provider>
    );
}
