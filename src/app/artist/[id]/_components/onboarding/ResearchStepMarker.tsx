import type { StageState } from "@/lib/onboarding/buildStages";

const SR_LABEL: Record<StageState, string> = { done: "done", active: "in progress", error: "stopped", pending: "not started" };

/** The dot on the research timeline: a check when done, the accent dot while
 *  running (pink in light, cyan in dark, per DESIGN.md), a cross when it
 *  stopped, an empty ring before it starts. The state is also spoken. */
export default function ResearchStepMarker({ state }: { state: StageState }) {
    return (
        <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            {state === "done" && (
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4.5 8.3l2.2 2.2 4.8-4.8" />
                </svg>
            )}
            {state === "active" && <span className="h-2.5 w-2.5 rounded-full bg-pastypink ring-4 ring-pastypink/25 dark:bg-pastyblue dark:ring-pastyblue/25" aria-hidden="true" />}
            {state === "error" && (
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-destructive dark:text-red-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 5l6 6M11 5l-6 6" />
                </svg>
            )}
            <span className="sr-only">{SR_LABEL[state]}</span>
        </span>
    );
}
