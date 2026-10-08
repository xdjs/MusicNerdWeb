"use client";

import { useContext } from "react";
import { Badge } from "@/components/ui/badge";
import { newKeys } from "@/lib/onboarding/newKeys";
import { OnboardingProgressContext } from "./OnboardingProgressContext";

/** "N new" beside a section's heading while it is fresh (docs/research-view.md). */
export default function ResearchNewCount({ kind, keys }: { kind: "links" | "sources"; keys: string[] }) {
    const research = useContext(OnboardingProgressContext);
    if (!research?.fresh[kind === "links" ? "profiles" : "vault"]) return null;
    const count = newKeys(research.baseline[kind], keys).length;
    if (!count) return null;
    return <Badge variant="highlight">{count} new</Badge>;
}
