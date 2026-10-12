"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildStepLabel } from "@/lib/onboarding/buildStepLabel";
import type { OnboardingStepName, OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";
import { stepSegments } from "@/lib/onboarding/stepSegments";
import FollowHint from "./FollowHint";
import ResearchSegment from "./ResearchSegment";
import ResearchStepCount from "./ResearchStepCount";
import { showResearchSection } from "./showResearchSection";

/** Where the Ask button sits (ArtistAskSheet), which the pill takes over while research runs. */
const PLACE = "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 max-w-[calc(100vw-2rem)] sm:right-8";

/** The soft activity-coloured glow that says the pill is live. */
const GLOW = "shadow-[0_0_0_1px_theme(colors.pastypink),0_0_18px_theme(colors.pastypink/30%),0_8px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_1px_theme(colors.pastyblue),0_0_18px_theme(colors.pastyblue/25%),0_8px_24px_rgba(0,0,0,0.4)]";

/**
 * The progress pill while research paints the profile in place
 * (docs/research-view.md, "Progress pill" and "Done"): the current step and
 * three segments, the running one sweeping, and which step of three it is;
 * clicking it takes the artist to the section being researched. Until the
 * first click the follow hint sits above it. Nothing else scrolls. On a
 * failure it offers "try again". Once complete it renders nothing: the profile
 * tour takes over and Ask comes back.
 */
export default function ResearchStatusBar({ steps, currentStep, complete, failure, onRetry }: {
    steps: OnboardingSteps;
    currentStep: OnboardingStepName | null;
    complete: boolean;
    failure: string | null;
    onRetry: () => void;
}) {
    const [hint, setHint] = useState(true);
    if (failure) {
        return (
            <section aria-label="Research status" className={`${PLACE} flex items-center gap-3 rounded-2xl bg-background py-2 pl-4 pr-2 text-foreground shadow-[0_0_0_1px_hsl(var(--destructive)/0.4),0_8px_24px_rgba(0,0,0,0.2)]`}>
                <p role="alert" className="m-0 text-sm leading-5">{failure}</p>
                <Button size="sm" onClick={onRetry} className="min-h-11 shrink-0 rounded-xl hover:opacity-90">try again</Button>
            </section>
        );
    }
    if (complete) return null;
    const segments = stepSegments(steps, currentStep);
    const follow = () => {
        setHint(false);
        showResearchSection(currentStep);
    };
    return (
        <section aria-label="Research status" className={`${PLACE} flex flex-col items-end gap-2`}>
            {hint && <FollowHint onFollow={follow} />}
            <button
                type="button"
                onClick={follow}
                className={`flex min-h-[52px] w-[21rem] max-w-full flex-col justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-left ${GLOW} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
                <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="h-2 w-2 flex-none rounded-full bg-pastypink motion-safe:animate-pulse dark:bg-pastyblue" aria-hidden="true" />
                    <span aria-live="polite" className="min-w-0 flex-1 truncate">{buildStepLabel(currentStep)}…</span>
                    <ResearchStepCount segments={segments} />
                    <span className="sr-only">, show me</span>
                </span>
                <span aria-hidden="true" className="grid grid-cols-3 gap-1.5">
                    {segments.map(segment => <ResearchSegment key={segment.label} state={segment.state} />)}
                </span>
            </button>
            <ol aria-label="Research steps" className="sr-only">
                {segments.map(segment => (
                    <li key={segment.label} aria-current={segment.state === "active" ? "step" : undefined}>
                        {segment.label}
                        {segment.state === "done" && " done"}
                    </li>
                ))}
            </ol>
        </section>
    );
}
