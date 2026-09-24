import { BUILD_STAGES, type BuildItem, type StageView } from "@/lib/onboarding/buildStages";

/** Each build stage as the popup shows it: pending until its group reports,
 *  active while it runs, done once it says so. */
export function stageStates(items: BuildItem[]): StageView[] {
    return BUILD_STAGES.map(stage => {
        const item = items.find(i => i.kind === "progress" && i.group === stage.group);
        if (!item) return { group: stage.group, label: stage.label, state: "pending" };
        return {
            group: stage.group,
            // The finished label carries the count ("Found 7 profiles"), which is
            // the interesting part — show it in place of the generic one.
            label: item.done && item.text ? item.text : stage.label,
            state: item.done ? "done" : "active",
        };
    });
}
