"use client";

import { Button } from "@/components/ui/button";
import { buildStepLabel } from "@/lib/onboarding/buildStepLabel";
import type { OnboardingStepName, OnboardingSteps } from "@/lib/onboarding/onboardingStateTypes";
import { stepSegments } from "@/lib/onboarding/stepSegments";
import { showResearchSection } from "./showResearchSection";

/** Where the Ask button sits (ArtistAskSheet), which the pill takes over while research runs. */
const PLACE = "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 max-w-[calc(100vw-2rem)] sm:right-8";

const BAR = {
    done: "bg-highlightpink",
    active: "bg-pastypink dark:bg-pastyblue motion-safe:animate-pulse",
    waiting: "bg-black/10 dark:bg-white/10",
};

/**
 * The progress pill while research paints the profile in place
 * (docs/research-view.md, "Progress pill" and "Done"): the current step and
 * three segments; clicking it takes the artist to the section being
 * researched. Nothing else scrolls. On a failure it offers "try again". Once
 * complete it renders nothing: the profile tour takes over and Ask comes back.
 */
export default function ResearchStatusBar({ steps, currentStep, complete, failure, onRetry }: {
    steps: OnboardingSteps;
    currentStep: OnboardingStepName | null;
    complete: boolean;
    failure: string | null;
    onRetry: () => void;
}) {
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
    return (
        <section aria-label="Research status" className={PLACE}>
            <button
                type="button"
                onClick={() => showResearchSection(currentStep)}
                className="flex min-h-[52px] w-64 max-w-full flex-col justify-center gap-2 rounded-2xl bg-background px-4 py-2.5 text-left shadow-[0_0_0_1px_hsl(var(--border)),0_8px_24px_rgba(0,0,0,0.2)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="h-2 w-2 flex-none rounded-full bg-pastypink motion-safe:animate-pulse dark:bg-pastyblue" aria-hidden="true" />
                    <span aria-live="polite" className="min-w-0 truncate">{buildStepLabel(currentStep)}…</span>
                    <span className="sr-only">, show me</span>
                </span>
                <span aria-hidden="true" className="grid grid-cols-3 gap-1.5">
                    {segments.map(segment => <span key={segment.label} className={`h-1 rounded-full ${BAR[segment.state]}`} />)}
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
