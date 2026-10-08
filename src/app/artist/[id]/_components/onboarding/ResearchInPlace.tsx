"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { BuildItem } from "@/lib/onboarding/buildStages";
import { buildFailure } from "@/lib/onboarding/buildFailure";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";
import { OnboardingProgressContext, type ResearchContextValue } from "./OnboardingProgressContext";
import ResearchStatusBar from "./ResearchStatusBar";
import { useFreshSections } from "./useFreshSections";
import { useOnboardingProgress } from "./useOnboardingProgress";

const STALLED = "This is taking longer than usual.";

export type ResearchItems = { links: string[]; sources: string[] };

/**
 * The artist's own page while research builds it (docs/research-view.md): the
 * status card over the page, each research section's skeleton and arrival from
 * the confirmed steps, and what is new against the links and sources the page
 * had when this mounted. Mounted only during the build and for the rest of the
 * visit after it, so the step-cards resume path never polls.
 */
export default function ResearchInPlace({ artistId, initialState, researchItems, items, onSkip, onRetry, onComplete, children }: {
    artistId: string;
    initialState: OnboardingStateView;
    researchItems: ResearchItems;
    items: BuildItem[];
    onSkip: () => void;
    onRetry: () => void;
    onComplete: () => void;
    children?: ReactNode;
}) {
    const progress = useOnboardingProgress(artistId, initialState, onComplete);
    const { fresh, markSeen } = useFreshSections(progress.steps);
    const [baseline] = useState(researchItems);
    const value = useMemo<ResearchContextValue>(() => ({ steps: progress.steps, fresh, markSeen, baseline }), [progress.steps, fresh, markSeen, baseline]);
    const failure = progress.complete ? null : buildFailure(items)?.message ?? (progress.stalled ? STALLED : null);
    return (
        <OnboardingProgressContext.Provider value={value}>
            <ResearchStatusBar
                steps={progress.steps}
                currentStep={progress.currentStep}
                complete={progress.complete}
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
