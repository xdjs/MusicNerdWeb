import { BUILD_DRAFTS, type BuildItem, type DraftView } from "@/lib/onboarding/buildStages";

/** The About stage's drafts that have any text yet, labelled and in the order
 *  the calls run (docs/llm.md, "Streaming into the build popup"). */
export function writingDrafts(items: BuildItem[]): DraftView[] {
    return BUILD_DRAFTS.flatMap(({ stage, label }) => {
        const text = items.find(i => i.kind === "writing" && i.stage === stage)?.text;
        return text ? [{ label, text }] : [];
    });
}
