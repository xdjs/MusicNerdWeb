import type { StepSegment } from "@/lib/onboarding/stepSegments";

const BAR: Record<StepSegment["state"], string> = {
    done: "bg-highlightpink",
    active: "relative overflow-hidden bg-pastypink/40 dark:bg-pastyblue/40",
    waiting: "bg-black/10 dark:bg-white/10",
};

/** One of the progress pill's three bars (docs/research-view.md, "Progress
 *  pill"): done, waiting, or running, which sweeps so the pill reads as live;
 *  under reduced motion the running bar fills instead. */
export default function ResearchSegment({ state }: { state: StepSegment["state"] }) {
    return (
        <span data-segment={state} className={`h-1 rounded-full ${BAR[state]}`}>
            {state === "active" && <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-pastypink motion-safe:animate-research-sweep motion-reduce:w-full dark:bg-pastyblue" />}
        </span>
    );
}
