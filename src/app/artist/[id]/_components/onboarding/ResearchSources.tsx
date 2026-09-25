import type { SourceView } from "@/lib/onboarding/buildStages";
import { listSummary } from "@/lib/onboarding/listSummary";
import { sourceDomain } from "@/lib/onboarding/sourceDomain";
import ResearchSourceCard from "./ResearchSourceCard";
import ResearchSourceRow from "./ResearchSourceRow";
import ResearchImageStack from "./ResearchImageStack";

const MUTED = "text-[hsl(var(--muted-foreground))]";
const CARDS = 3;
const ROWS = 4;

/** "Reading what's written about you", as the research view shows it: up to
 *  three sources with a share image as cards, up to four more as rows, and
 *  once the stage ends the total, pointing to the Lore for the rest.
 *  Collapsed, a thumbnail stack and their domains (docs/research-view.md). */
export default function ResearchSources({ sources, total, collapsed }: {
    sources: SourceView[];
    total: number | null;
    collapsed: boolean;
}) {
    if (collapsed) {
        return (
            <div className="flex items-center gap-3">
                <ResearchImageStack entries={sources.map(s => ({
                    key: s.url,
                    letter: sourceDomain(s.url).charAt(0),
                    images: [{ src: s.ogImage }],
                }))} />
                <span className={`text-sm ${MUTED}`}>{listSummary(sources.map(s => sourceDomain(s.url)), 3)}</span>
            </div>
        );
    }
    const cards = sources.filter(s => s.ogImage).slice(0, CARDS);
    const rows = sources.filter(s => !cards.includes(s)).slice(0, ROWS);
    const more = total === null ? 0 : total - cards.length - rows.length;
    return (
        <>
            {cards.length > 0 && (
                <ul aria-label="Sources with images" className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
                    {cards.map(s => <ResearchSourceCard key={s.url} source={s} />)}
                </ul>
            )}
            {rows.length > 0 && (
                <ul aria-label="More sources" className="m-0 flex list-none flex-col gap-1 p-0">
                    {rows.map(s => <ResearchSourceRow key={s.url} source={s} />)}
                </ul>
            )}
            {total !== null && total > 0 && (
                <p className={`m-0 text-sm leading-6 ${MUTED}`}>
                    {`${total} source${total === 1 ? "" : "s"} in all.`}
                    {more > 0 && ` ${more} more ${more === 1 ? "is" : "are"} in your lore, where you can keep or remove each one.`}
                </p>
            )}
        </>
    );
}
