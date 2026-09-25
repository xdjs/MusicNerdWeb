"use client";

import { lazy, Suspense, useState } from "react";
import type { BuildItem } from "@/lib/onboarding/buildStages";
import type { LatestRelease } from "@/server/utils/musicPlatform/latestReleases";
import { stageStates } from "@/lib/onboarding/stageStates";
import { writingDrafts } from "@/lib/onboarding/writingDrafts";
import { buildFailure } from "@/lib/onboarding/buildFailure";
import { foundProfiles } from "@/lib/onboarding/foundProfiles";
import { unreachableNote } from "@/lib/onboarding/unreachableNote";
import { savedSources } from "@/lib/onboarding/savedSources";
import ResearchStep from "./ResearchStep";
import ResearchReleases from "./ResearchReleases";
import ResearchProfiles from "./ResearchProfiles";
import ResearchSources from "./ResearchSources";

// Streamdown and its Markdown stack load only once there's a draft to show.
const ResearchDraft = lazy(() => import("./ResearchDraft"));

// `text-muted-foreground` is forced to white in dark mode by an `!important`
// override in globals.css (DESIGN.md, inconsistency #5). Reading the token
// directly keeps the same colour in both themes without adding to that wall.
const MUTED = "text-[hsl(var(--muted-foreground))]";

const PRIMARY = "inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-5 text-[15px] font-semibold text-background transition-opacity hover:opacity-90";
const GHOST = "inline-flex h-11 items-center justify-center rounded-xl px-3 -ml-3 text-sm text-[hsl(var(--muted-foreground))] transition-colors hover:text-foreground";

/**
 * What a newly claimed artist sees while research builds their page
 * (docs/research-view.md): a live view of each step that takes the artist
 * page's place, replacing the build popup. A failed build stays here with its partial draft and
 * "try again", where the popup used to drop what had streamed.
 */
export default function ResearchView({ artistName, imageUrl, releases, items, complete, onSkip, onFinish, onRetry }: {
    artistName: string;
    imageUrl?: string;
    releases?: Promise<LatestRelease[]>;
    items: BuildItem[];
    complete: boolean;
    onSkip: () => void;
    onFinish: () => void;
    onRetry: () => void;
}) {
    const stages = stageStates(items);
    const drafts = writingDrafts(items);
    const failure = buildFailure(items);
    const profiles = foundProfiles(items);
    const note = unreachableNote(items);
    const sources = savedSources(items);
    const cardCount: Record<string, number> = { "platform-search": profiles.length, "source-search": sources.sources.length };
    // A stage with cards stays open while the build runs and collapses to its
    // summary once the page is ready (docs/research-view.md); the artist can
    // open or close it either way.
    const [toggled, setToggled] = useState<Record<string, boolean>>({});
    const isOpen = (group: string) => toggled[group] ?? !complete;
    const toggle = (group: string) => setToggled(t => ({ ...t, [group]: !isOpen(group) }));

    // In the page flow, in place of the artist page and under the app's own nav
    // (docs/research-view.md). It inherits the page container, so it resizes the
    // way every other page does; the heading and photo scale fluidly with it.
    return (
        <section aria-labelledby="research-view-title" className="flex flex-col gap-10 py-4 text-foreground sm:gap-14 sm:py-8">
            <div className="flex flex-col gap-5">
                {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- the artist's own image, as in the page hero
                    <img src={imageUrl} alt={artistName} className="aspect-square w-[clamp(5.5rem,12vw,7rem)] rounded-3xl object-cover ring-1 ring-border" />
                )}
                <div className="flex flex-col gap-2">
                    <span className={`text-sm ${MUTED}`}>{complete ? "your page is ready" : "setting up your page"}</span>
                    <h1 id="research-view-title" className="text-[clamp(2.25rem,6vw,3.75rem)] font-bold leading-none tracking-tight">{artistName}</h1>
                    <p className={`text-base ${MUTED}`}>
                        {complete ? "edit anything, and take off anything that isn’t you." : "we’re reading what the web knows about you, so you don’t have to."}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {complete
                        ? <button type="button" onClick={onFinish} className={PRIMARY}>see my page</button>
                        : <button type="button" onClick={onSkip} className={GHOST}>skip for now</button>}
                </div>
                {releases && <Suspense fallback={null}><ResearchReleases releases={releases} /></Suspense>}
            </div>

            <ol aria-label="Research steps" className="m-0 list-none p-0">
                {stages.map((stage, i) => {
                    const hasCards = (cardCount[stage.group] ?? 0) > 0;
                    // Once done, say how many cards there are: discovery proposes
                    // more than the build writes, and the label sits above the cards.
                    const title = stage.group === "platform-search" && hasCards && stage.state === "done"
                        ? `Found ${profiles.length} profile${profiles.length === 1 ? "" : "s"}`
                        : stage.label;
                    return (
                        <ResearchStep
                            key={stage.group}
                            state={stage.state}
                            title={title}
                            last={i === stages.length - 1}
                            expanded={hasCards ? isOpen(stage.group) : undefined}
                            onToggle={hasCards ? () => toggle(stage.group) : undefined}
                        >
                            {stage.group === "platform-search" && (profiles.length > 0 || note) && (
                                <ResearchProfiles profiles={profiles} note={note} collapsed={hasCards && !isOpen(stage.group)} />
                            )}
                            {stage.group === "source-search" && hasCards && (
                                <ResearchSources sources={sources.sources} total={sources.total} collapsed={!isOpen(stage.group)} />
                            )}
                            {stage.state === "error" && failure && (
                                <div className="flex flex-col items-start gap-3">
                                    <p role="alert" className="m-0 rounded-xl bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground">{failure.message}</p>
                                    <button type="button" onClick={onRetry} className={PRIMARY}>try again</button>
                                </div>
                            )}
                            {stage.group === "about-write" && drafts.length > 0 && (
                                <Suspense fallback={null}>
                                    {drafts.map(d => <ResearchDraft key={d.label} label={d.label} text={d.text} />)}
                                </Suspense>
                            )}
                        </ResearchStep>
                    );
                })}
            </ol>
        </section>
    );
}
