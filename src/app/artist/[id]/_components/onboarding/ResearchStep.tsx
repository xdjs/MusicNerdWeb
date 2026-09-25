import type { ReactNode } from "react";
import type { StageState } from "@/lib/onboarding/buildStages";
import ResearchStepMarker from "./ResearchStepMarker";

/** One stage on the research timeline: its marker on a thin vertical rule,
 *  its title, and whatever the stage has produced so far beneath it. With
 *  `onToggle`, the title is a button that opens and closes that content
 *  (a chevron beside it, `aria-expanded`). */
export default function ResearchStep({ state, title, last = false, expanded, onToggle, children }: {
    state: StageState;
    title: string;
    last?: boolean;
    expanded?: boolean;
    onToggle?: () => void;
    children?: ReactNode;
}) {
    const titleClass = `text-[15px] font-medium lowercase ${state === "pending" ? "text-[hsl(var(--muted-foreground))]" : "text-foreground"}`;
    return (
        <li className="flex gap-4" aria-current={state === "active" ? "step" : undefined}>
            <div className="flex w-5 flex-shrink-0 flex-col items-center pt-0.5">
                <ResearchStepMarker state={state} />
                {!last && <span className="mt-1.5 w-px flex-grow bg-border" aria-hidden="true" />}
            </div>
            <div className={`min-w-0 flex-grow ${last ? "" : "pb-7"}`}>
                {onToggle ? (
                    <button type="button" onClick={onToggle} aria-expanded={!!expanded} className={`inline-flex items-center gap-1.5 text-left ${titleClass}`}>
                        {title}
                        <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4.5 6.5L8 10l3.5-3.5" />
                        </svg>
                    </button>
                ) : (
                    <span className={titleClass}>{title}</span>
                )}
                {children && <div className="flex flex-col gap-5 pt-3">{children}</div>}
            </div>
        </li>
    );
}
