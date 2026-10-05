"use client";

import { useContext, type ReactNode } from "react";
import type { OnboardingStepName } from "@/lib/onboarding/onboardingStateTypes";
import { OnboardingProgressContext } from "./OnboardingProgressContext";

/**
 * A profile section that research fills (docs/research-view.md, "Sections"):
 * while its step isn't confirmed, a loading line above it, or with
 * `hideUntilDone` instead of it. With no build being watched, or once its step
 * is confirmed, just the section.
 */
export default function ResearchPending({ step, label, hideUntilDone = false, children }: {
    step: OnboardingStepName;
    label: string;
    hideUntilDone?: boolean;
    children?: ReactNode;
}) {
    const steps = useContext(OnboardingProgressContext);
    if (!steps || steps[step] !== null) return <>{children}</>;
    return (
        <>
            <p role="status" className="m-0 flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-pastypink dark:bg-pastyblue" aria-hidden="true" />
                {label}
            </p>
            {!hideUntilDone && children}
        </>
    );
}
