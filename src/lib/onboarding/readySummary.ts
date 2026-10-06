const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** The "Your page is ready" line: what research found, then the About. */
export function readySummary(newLinks: number, newSources: number): string {
    const found = [newLinks > 0 && count(newLinks, "profile"), newSources > 0 && count(newSources, "source")].filter(Boolean);
    return found.length ? `We found ${found.join(" and ")}, and wrote your About.` : "We wrote your About.";
}
