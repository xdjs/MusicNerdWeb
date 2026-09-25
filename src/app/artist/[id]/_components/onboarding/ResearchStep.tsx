import type { ReactNode } from "react";
import type { StageState } from "@/lib/onboarding/buildStages";
import ResearchStepMarker from "./ResearchStepMarker";

/** One stage on the research timeline: its marker on a thin vertical rule,
 *  its title, and whatever the stage has produced so far beneath it. */
export default function ResearchStep({ state, title, last = false, children }: {
    state: StageState;
    title: string;
    last?: boolean;
    children?: ReactNode;
}) {
    return (
        <li className="flex gap-4" aria-current={state === "active" ? "step" : undefined}>
            <div className="flex w-5 flex-shrink-0 flex-col items-center pt-0.5">
                <ResearchStepMarker state={state} />
                {!last && <span className="mt-1.5 w-px flex-grow bg-border" aria-hidden="true" />}
            </div>
            <div className={`min-w-0 flex-grow ${last ? "" : "pb-7"}`}>
                <span className={`text-[15px] font-medium lowercase ${state === "pending" ? "text-[hsl(var(--muted-foreground))]" : "text-foreground"}`}>{title}</span>
                {children && <div className="flex flex-col gap-5 pt-3">{children}</div>}
            </div>
        </li>
    );
}
