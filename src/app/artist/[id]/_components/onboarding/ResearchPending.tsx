"use client";

import { useContext, type ReactNode } from "react";
import { ResearchProgressContext } from "./ResearchProgressContext";

/**
 * A profile section that research fills (docs/research-view.md, "In place"):
 * while its stage hasn't finished, a loading line above it; with
 * `hideUntilDone`, the loading line instead of it. With no build running, or
 * once its stage is done or has failed, just the section.
 */
export default function ResearchPending({ group, label, hideUntilDone = false, children }: {
    group: string;
    label: string;
    hideUntilDone?: boolean;
    children?: ReactNode;
}) {
    const stage = useContext(ResearchProgressContext)?.find(s => s.group === group);
    if (!stage || stage.state === "done" || stage.state === "error") return <>{children}</>;
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
