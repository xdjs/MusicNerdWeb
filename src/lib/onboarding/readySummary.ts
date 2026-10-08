import { countLabel } from "./countLabel";

/** The "Your page is ready" line: what research found, then the About. */
export function readySummary(newLinks: number, newSources: number): string {
    const found = [newLinks > 0 && countLabel(newLinks, "profile"), newSources > 0 && countLabel(newSources, "source")].filter(Boolean);
    return found.length ? `We found ${found.join(" and ")}, and wrote your About.` : "We wrote your About.";
}
