"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";
import { OnboardingProgressContext, type ResearchContextValue } from "./OnboardingProgressContext";
import ResearchStatusBar from "./ResearchStatusBar";
import { useFreshSections } from "./useFreshSections";
import { useOnboardingProgress } from "./useOnboardingProgress";
import { useRestartClaimBuild } from "./useRestartClaimBuild";

const STALLED = "This is taking longer than usual.";
const RESTART_FAILED = "Couldn't restart the build. Try again in a moment.";

export type ResearchItems = { links: string[]; sources: string[] };

/**
 * The artist's own page while MusicNerdAPI builds it (docs/research-view.md):
 * the progress pill over the page, each research section's skeleton and
 * arrival from the confirmed steps, and what is new against the links and
 * sources the page had when this mounted. The build runs on the server; this
 * only watches it, and "Try again" restarts it. Nothing scrolls by itself.
 */
export default function ResearchInPlace({ artistId, initialState, researchItems, onComplete, children }: {
    artistId: string;
    initialState: OnboardingStateView;
    researchItems: ResearchItems;
    onComplete: () => void;
    children?: ReactNode;
}) {
    const progress = useOnboardingProgress(artistId, initialState, onComplete);
    const { fresh, markSeen } = useFreshSections(progress.steps);
    const [baseline] = useState(researchItems);
    const [restartFailed, setRestartFailed] = useState(false);
    const restart = useRestartClaimBuild(artistId);
    const value = useMemo<ResearchContextValue>(() => ({ steps: progress.steps, currentStep: progress.currentStep, fresh, markSeen, complete: progress.complete, baseline }), [progress.steps, progress.currentStep, fresh, markSeen, progress.complete, baseline]);
    const failure = progress.complete ? null : restartFailed ? RESTART_FAILED : progress.stalled ? STALLED : null;
    return (
        <OnboardingProgressContext.Provider value={value}>
            <ResearchStatusBar
                steps={progress.steps}
                currentStep={progress.currentStep}
                complete={progress.complete}
                failure={failure}
                onRetry={() => {
                    progress.resetStall();
                    setRestartFailed(false);
                    void restart().then(ok => setRestartFailed(!ok));
                }}
            />
            {children}
        </OnboardingProgressContext.Provider>
    );
}
