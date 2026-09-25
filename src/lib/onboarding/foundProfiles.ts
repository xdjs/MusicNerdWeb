import type { BuildItem, ProfileView } from "@/lib/onboarding/buildStages";

/** The profiles the research view shows under "finding your profiles": the
 *  candidates discovery reports while it runs, then, once the build writes,
 *  exactly what it wrote (docs/research-view.md). Each `linked` item is one
 *  write; later ones replace earlier ones for the same platform. */
export function foundProfiles(items: BuildItem[]): ProfileView[] {
    const writes = items.filter(i => i.kind === "linked");
    if (writes.length === 0) return items.find(i => i.kind === "candidates")?.candidates ?? [];
    const bySiteName = new Map<string, ProfileView>();
    for (const write of writes) for (const p of write.candidates ?? []) bySiteName.set(p.siteName, p);
    return [...bySiteName.values()];
}
