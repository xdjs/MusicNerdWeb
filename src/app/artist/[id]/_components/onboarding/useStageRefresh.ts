"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { BuildItem } from "@/lib/onboarding/buildStages";

/**
 * Repaints the profile from the database as research lands
 * (docs/research-view.md, "In place"): one `router.refresh()` each time a
 * stage reports done, and on `complete` one more, then `onComplete`.
 */
export function useStageRefresh(items: BuildItem[], onComplete: () => void): void {
    const router = useRouter();
    const doneGroups = useRef(new Set<string>());
    const finished = useRef(false);

    useEffect(() => {
        let refresh = false;
        for (const item of items) {
            if (item.kind === "progress" && item.done && item.group && !doneGroups.current.has(item.group)) {
                doneGroups.current.add(item.group);
                refresh = true;
            }
        }
        const complete = items.some(i => i.kind === "complete");
        if (complete && !finished.current) {
            finished.current = true;
            router.refresh();
            onComplete();
            return;
        }
        if (refresh) router.refresh();
    }, [items, router, onComplete]);
}
