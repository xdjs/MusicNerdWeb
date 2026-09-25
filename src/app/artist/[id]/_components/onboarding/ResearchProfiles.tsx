import type { ProfileView } from "@/lib/onboarding/buildStages";
import { listSummary } from "@/lib/onboarding/listSummary";
import ResearchProfileCard from "./ResearchProfileCard";
import ResearchImageStack from "./ResearchImageStack";

const MUTED = "text-[hsl(var(--muted-foreground))]";

/** "Finding your profiles", as the research view shows it: a card per
 *  profile and one sentence for platforms that refused to answer; collapsed,
 *  a stack of their images and a one-line summary (docs/research-view.md). */
export default function ResearchProfiles({ profiles, note, collapsed }: {
    profiles: ProfileView[];
    note: string | null;
    collapsed: boolean;
}) {
    if (collapsed) {
        return (
            <div className="flex items-center gap-3">
                <ResearchImageStack entries={profiles.map(p => ({
                    key: `${p.siteName}:${p.value}`,
                    letter: p.displayName.charAt(0).toLowerCase(),
                    images: [{ src: p.previewImage }, { src: p.logoUrl, inset: true }],
                }))} />
                <span className={`text-sm lowercase ${MUTED}`}>{listSummary(profiles.map(p => p.displayName.toLowerCase()))}</span>
            </div>
        );
    }
    return (
        <>
            {profiles.length > 0 && (
                <ul aria-label="Your profiles" className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                    {profiles.map(p => <ResearchProfileCard key={`${p.siteName}:${p.value}`} profile={p} />)}
                </ul>
            )}
            {note && <p className={`m-0 text-sm leading-6 ${MUTED}`}>{note}</p>}
        </>
    );
}
