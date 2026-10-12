import type { StepSegment } from "@/lib/onboarding/stepSegments";

/** Which of the three steps is running, "N of 3" (docs/research-view.md,
 *  "Progress pill"); nothing while no step is running. */
export default function ResearchStepCount({ segments }: { segments: StepSegment[] }) {
    const position = segments.findIndex(segment => segment.state === "active") + 1;
    if (position === 0) return null;
    return <span className="flex-none text-xs font-medium text-[hsl(var(--muted-foreground))]">{position} of {segments.length}</span>;
}
