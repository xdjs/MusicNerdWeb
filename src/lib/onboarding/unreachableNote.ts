import type { BuildItem } from "@/lib/onboarding/buildStages";
import { listSummary } from "@/lib/onboarding/listSummary";

/** The one sentence the research view shows for platforms that refused to
 *  answer discovery (a login wall or a rate limit), or null when every
 *  platform answered. Refused is not the same as "not there", and it says so. */
export function unreachableNote(items: BuildItem[]): string | null {
    const platforms = items.find(i => i.kind === "unreachable")?.platforms ?? [];
    if (platforms.length === 0) return null;
    const names = listSummary(platforms.map(p => p.toLowerCase()), platforms.length);
    return `${names} wouldn’t let us look just now, so that’s not a “no”. you can add ${platforms.length === 1 ? "it" : "them"} from your page.`;
}
