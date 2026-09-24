"use client";

import { writingDrafts } from "@/lib/onboarding/writingDrafts";
import type { BuildItem } from "@/lib/onboarding/buildStages";
import BuildDraft from "./BuildDraft";

/** The About stage's drafts, shown under "Writing your About" as they are
 *  written and indented to the stage label. Renders nothing until there is text. */
export default function BuildDrafts({ items }: { items: BuildItem[] }) {
    const drafts = writingDrafts(items);
    if (drafts.length === 0) return null;
    return (
        <div className="mt-2.5 ml-[38px] space-y-2">
            {drafts.map(d => <BuildDraft key={d.label} label={d.label} text={d.text} />)}
        </div>
    );
}
