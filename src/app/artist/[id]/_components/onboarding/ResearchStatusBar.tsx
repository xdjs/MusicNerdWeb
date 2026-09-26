"use client";

/**
 * The one line at the top of the profile while research paints it in place
 * (docs/research-view.md, "In place"): the current step and "skip for now",
 * or a failure and "try again". Slice 2 of #1365 replaces it with the designed
 * above-the-fold indicator.
 */
export default function ResearchStatusBar({ step, failure, onSkip, onRetry }: {
    step: string | null;
    failure: string | null;
    onSkip: () => void;
    onRetry: () => void;
}) {
    const button = "min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium transition-colors";
    if (failure) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-2 text-foreground">
                <p role="alert" className="m-0 text-sm leading-6">{failure}</p>
                <button type="button" onClick={onRetry} className={`${button} bg-foreground text-background hover:opacity-90`}>try again</button>
            </div>
        );
    }
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-1 shadow-[0_0_0_1px_hsl(var(--border))]">
            <p aria-live="polite" className="m-0 flex items-center gap-2 text-sm lowercase text-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-pastypink dark:bg-pastyblue" aria-hidden="true" />
                {step ? `${step}…` : "setting up your page…"}
            </p>
            <button type="button" onClick={onSkip} className={`${button} text-[hsl(var(--muted-foreground))] hover:text-foreground`}>skip for now</button>
        </div>
    );
}
