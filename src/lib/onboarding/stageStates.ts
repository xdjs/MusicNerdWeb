import { BUILD_STAGES, type BuildItem, type StageView } from "@/lib/onboarding/buildStages";
import { buildFailure } from "@/lib/onboarding/buildFailure";

/** Each build stage as the research view shows it: pending until its group
 *  reports, active while it runs, done once it says so. When the build ends on
 *  an error, the first stage that hadn't finished is the one that failed. Once
 *  the build completes every stage is done, including one whose own "done"
 *  never arrived (a retry after a dropped connection gets only `complete`). */
export function stageStates(items: BuildItem[]): StageView[] {
    const complete = items.some(i => i.kind === "complete");
    const views: StageView[] = BUILD_STAGES.map(stage => {
        const item = items.find(i => i.kind === "progress" && i.group === stage.group);
        if (!item) return { group: stage.group, label: stage.label, state: complete ? "done" : "pending" };
        return {
            group: stage.group,
            // The finished label carries the count ("Found 7 profiles"), which is
            // the interesting part — show it in place of the generic one.
            label: item.done && item.text ? item.text : stage.label,
            state: item.done || complete ? "done" : "active",
        };
    });
    if (!buildFailure(items)) return views;
    const failed = views.findIndex(v => v.state !== "done");
    return failed < 0 ? views : views.map((v, i) => (i === failed ? { ...v, state: "error" } : v));
}
