import type { BuildItem, SourceView } from "@/lib/onboarding/buildStages";

/** The sources the research view shows under "reading what's written about
 *  you": each one as it is saved, then, once the stage ends, every source on
 *  the page with the total (docs/research-view.md). The ones saved in this
 *  build stay first, so what the artist watched arrive stays in view. */
export function savedSources(items: BuildItem[]): { sources: SourceView[]; total: number | null } {
    const byUrl = new Map<string, SourceView>();
    for (const item of items) if (item.kind === "source") for (const s of item.saved ?? []) if (!byUrl.has(s.url)) byUrl.set(s.url, s);
    const onPage = items.find(i => i.kind === "sources")?.saved;
    if (!onPage) return { sources: [...byUrl.values()], total: null };
    for (const s of onPage) if (!byUrl.has(s.url)) byUrl.set(s.url, s);
    return { sources: [...byUrl.values()], total: byUrl.size };
}
