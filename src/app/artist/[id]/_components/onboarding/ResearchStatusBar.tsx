"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildStepLabel } from "@/lib/onboarding/buildStepLabel";
import type { OnboardingStepName, OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";
import { stepSegments } from "@/lib/onboarding/stepSegments";
import { showResearchSection } from "./showResearchSection";

/** Where the Ask button sits (ArtistAskSheet), which the pill takes over while research runs. */
const PLACE = "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 max-w-[calc(100vw-2rem)] sm:right-8";

const BAR = {
    done: "bg-highlightpink",
    active: "relative overflow-hidden bg-pastypink/40 dark:bg-pastyblue/40",
    waiting: "bg-black/10 dark:bg-white/10",
};

/** The soft activity-coloured glow that says the pill is live. */
const GLOW = "shadow-[0_0_0_1px_theme(colors.pastypink),0_0_18px_theme(colors.pastypink/30%),0_8px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_0_0_1px_theme(colors.pastyblue),0_0_18px_theme(colors.pastyblue/25%),0_8px_24px_rgba(0,0,0,0.4)]";

/**
 * The progress pill while research paints the profile in place
 * (docs/research-view.md, "Progress pill" and "Done"): the current step and
 * three segments, the running one sweeping, and which step of three it is;
 * clicking it takes the artist to the section being researched. Until the
 * first click a "Tap to follow along" hint sits above it; tapping the hint
 * does what tapping the pill does. Nothing else scrolls. On a failure it offers "try again". Once
 * complete it renders nothing: the profile tour takes over and Ask comes back.
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
    const position = segments.findIndex(segment => segment.state === "active") + 1;
    const follow = () => {
        setHint(false);
        showResearchSection(currentStep);
    };
    return (
        <section aria-label="Research status" className={`${PLACE} flex flex-col items-end gap-2`}>
            {hint && (
                <button type="button" tabIndex={-1} aria-hidden="true" onClick={follow} className="flex min-h-9 items-center gap-1.5 rounded-full bg-highlightpink px-2.5 py-1.5 text-[13px] font-semibold text-black hover:opacity-90">
                    Tap to follow along
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="motion-safe:animate-bounce"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                </button>
            )}
            <button
                type="button"
                onClick={follow}
                className={`flex min-h-[52px] w-[21rem] max-w-full flex-col justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-left ${GLOW} transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}>
                <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="h-2 w-2 flex-none rounded-full bg-pastypink motion-safe:animate-pulse dark:bg-pastyblue" aria-hidden="true" />
                    <span aria-live="polite" className="min-w-0 flex-1 truncate">{buildStepLabel(currentStep)}…</span>
                    {position > 0 && <span className="flex-none text-xs font-medium text-[hsl(var(--muted-foreground))]">{position} of 3</span>}
                    <span className="sr-only">, show me</span>
                </span>
                <span aria-hidden="true" className="grid grid-cols-3 gap-1.5">
                    {segments.map(segment => (
                        <span key={segment.label} data-segment={segment.state} className={`h-1 rounded-full ${BAR[segment.state]}`}>
                            {segment.state === "active" && <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-pastypink motion-safe:animate-research-sweep motion-reduce:w-full dark:bg-pastyblue" />}
                        </span>
                    ))}
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
