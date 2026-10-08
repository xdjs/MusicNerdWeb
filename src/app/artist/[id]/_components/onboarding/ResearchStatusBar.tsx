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
 * segments and "skip for now"; or a failure with "try again". Once complete it
 * renders nothing: the profile tour takes over.
 */
export default function ResearchStatusBar({ steps, currentStep, complete, failure, onSkip, onRetry }: {
    steps: OnboardingSteps;
    currentStep: OnboardingStepName | null;
    complete: boolean;
    failure: string | null;
    onSkip: () => void;
    onRetry: () => void;
}) {
    if (failure) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-2 text-foreground">
                <p role="alert" className="m-0 text-sm leading-6">{failure}</p>
                <Button size="sm" onClick={onRetry} className={`${SMALL} hover:opacity-90`}>try again</Button>
            </div>
        );
    }
    if (complete) return null;
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
