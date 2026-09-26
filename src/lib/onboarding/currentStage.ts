import type { StageView } from "@/lib/onboarding/buildStages";

/** The stage the build is on: the one running or the one that failed, else
 *  the next to start. Null once every stage is done. */
export function currentStage(stages: StageView[]): StageView | null {
    return stages.find(s => s.state === "active" || s.state === "error")
        ?? stages.find(s => s.state === "pending")
        ?? null;
}
