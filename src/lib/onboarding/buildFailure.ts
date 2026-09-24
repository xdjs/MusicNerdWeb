import type { BuildItem } from "@/lib/onboarding/buildStages";

/** The build's failure, when its last item is an error. A retry appends new
 *  items (the build's opening line first), which clears it. Progress and draft
 *  items update in place, so the last item is the only reliable ordering. */
export function buildFailure(items: BuildItem[]): { message: string } | null {
    const last = items[items.length - 1];
    return last?.kind === "error" ? { message: last.text ?? "" } : null;
}
