"use client";

import { useContext } from "react";
import { newKeys } from "@/lib/onboarding/newKeys";
import { OnboardingProgressContext } from "./OnboardingProgressContext";

/** "N new" beside a section's heading while it is fresh (docs/research-view.md). */
export default function ResearchNewCount({ kind, keys }: { kind: "links" | "sources"; keys: string[] }) {
    const research = useContext(OnboardingProgressContext);
    if (!research?.fresh[kind === "links" ? "profiles" : "vault"]) return null;
    const count = newKeys(research.baseline[kind], keys).length;
    if (!count) return null;
    return <span className="rounded-full bg-highlightpink px-2.5 py-0.5 text-xs font-bold text-black">{count} new</span>;
}
