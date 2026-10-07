"use client";

import { useContext, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { OnboardingProgressContext } from "./OnboardingProgressContext";

/**
 * Marks one link or source that arrived with the build being watched
 * (docs/research-view.md, "What counts as new"): a pink ring and a "new" marker
 * while its section is fresh. Everything else renders as is.
 */
export default function ResearchNewMark({ kind, itemKey, children }: {
    kind: "links" | "sources";
    itemKey: string;
    children: ReactNode;
}) {
    const research = useContext(OnboardingProgressContext);
    const isNew = !!research && research.fresh[kind === "links" ? "profiles" : "vault"] && !research.baseline[kind].includes(itemKey);
    if (!isNew) return <>{children}</>;
    return (
        <div data-research-new-item="" className={`relative ${kind === "links" ? "rounded-xl" : "rounded-2xl"} ring-2 ring-highlightpink transition-shadow`}>
            {children}
            {kind === "links"
                ? <span aria-label="new" className="absolute right-1 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-highlightpink" />
                : <Badge variant="highlight" aria-label="new" className="absolute right-2.5 top-2.5 px-2 text-[11px]">new</Badge>}
        </div>
    );
}
