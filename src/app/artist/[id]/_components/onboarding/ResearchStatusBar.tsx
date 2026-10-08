"use client";

import { Button } from "@/components/ui/button";
import { buildStepLabel } from "@/lib/onboarding/buildStepLabel";
import type { OnboardingStepName, OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";
import { stepSegments } from "@/lib/onboarding/stepSegments";

const SMALL = "min-h-11 shrink-0 rounded-lg";

const BAR = {
    done: "bg-highlightpink",
    active: "bg-pastypink dark:bg-pastyblue motion-safe:animate-pulse",
    waiting: "bg-black/10 dark:bg-white/10",
};

/**
 * The status card above the fold while research paints the profile in place
 * (docs/research-view.md, "Status card" and "Done"): the current step, three
 * segments and "skip for now"; once complete, "Your page is ready" with a way
 * to what changed; or a failure with "try again".
 */
export default function ResearchStatusBar({ steps, currentStep, complete, summary, failure, onSkip, onRetry, onSeeResults }: {
    steps: OnboardingSteps;
    currentStep: OnboardingStepName | null;
    complete: boolean;
    summary: string;
    failure: string | null;
    onSkip: () => void;
    onRetry: () => void;
    onSeeResults: () => void;
}) {
    if (failure) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-2 text-foreground">
                <p role="alert" className="m-0 text-sm leading-6">{failure}</p>
                <Button size="sm" onClick={onRetry} className={`${SMALL} hover:opacity-90`}>try again</Button>
            </div>
        );
    }
    if (complete) {
        return (
            <section aria-label="Your page is ready" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-highlightpink/70 bg-highlightpink/10 px-4 py-3 text-foreground">
                <p role="status" className="m-0 flex flex-col gap-0.5">
                    <strong className="text-base">Your page is ready</strong>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">{summary}</span>
                </p>
                <Button variant="pink" onClick={onSeeResults} className="rounded-xl text-[15px]">
                    See what we found
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
                </Button>
            </section>
        );
    }
    return (
        <section aria-label="Research status" className="flex flex-col gap-3 rounded-2xl px-4 py-3 shadow-[0_0_0_1px_hsl(var(--border))]">
            <div className="flex items-center justify-between gap-3">
                <p aria-live="polite" className="m-0 flex items-center gap-2.5 text-[15px] font-semibold text-foreground">
                    <span className="h-2 w-2 flex-none rounded-full bg-pastypink motion-safe:animate-pulse dark:bg-pastyblue" aria-hidden="true" />
                    {buildStepLabel(currentStep)}…
                </p>
                <Button variant="ghost" size="sm" onClick={onSkip} className={`${SMALL} text-[hsl(var(--muted-foreground))] hover:text-foreground`}>skip for now</Button>
            </div>
            <ol aria-label="Research steps" className="m-0 grid list-none grid-cols-3 gap-2 p-0">
                {stepSegments(steps, currentStep).map(segment => (
                    <li key={segment.label} aria-current={segment.state === "active" ? "step" : undefined} className="flex flex-col gap-1.5">
                        <span aria-hidden="true" className={`h-1 rounded-full ${BAR[segment.state]}`} />
                        <span className={`text-xs ${segment.state === "waiting" ? "text-[hsl(var(--muted-foreground))]" : "text-foreground"}`}>
                            {segment.label}
                            {segment.state === "done" && <span className="sr-only"> done</span>}
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    );
}
