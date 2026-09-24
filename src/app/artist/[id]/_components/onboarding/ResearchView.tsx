"use client";

import { lazy, Suspense } from "react";
import type { BuildItem } from "@/lib/onboarding/buildStages";
import type { LatestRelease } from "@/server/utils/musicPlatform/latestReleases";
import { stageStates } from "@/lib/onboarding/stageStates";
import { writingDrafts } from "@/lib/onboarding/writingDrafts";
import { buildFailure } from "@/lib/onboarding/buildFailure";
import ResearchStep from "./ResearchStep";
import ResearchReleases from "./ResearchReleases";

// Streamdown and its Markdown stack load only once there's a draft to show.
const ResearchDraft = lazy(() => import("./ResearchDraft"));

const PRIMARY = "inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-5 text-[15px] font-semibold text-background transition-opacity hover:opacity-90";
const GHOST = "inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:text-foreground";

/**
 * What a newly claimed artist sees while research builds their page
 * (docs/research-view.md): a full-screen, live view of each step, replacing
 * the build popup. A failed build stays here with its partial draft and
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

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-5 backdrop-blur-md sm:px-8">
                <span className="text-xl font-bold tracking-tight text-pastypink">music nerd</span>
                {complete
                    ? <button type="button" onClick={onFinish} className={PRIMARY}>see my page</button>
                    : <button type="button" onClick={onSkip} className={GHOST}>skip for now</button>}
            </header>

            <main className="mx-auto flex w-full max-w-[720px] flex-col gap-10 px-5 py-9 sm:gap-14 sm:py-16">
                <div className="flex flex-col gap-5">
                    {imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- the artist's own image, as in the page hero
                        <img src={imageUrl} alt={artistName} className="h-[88px] w-[88px] rounded-3xl object-cover ring-1 ring-border sm:h-28 sm:w-28" />
                    )}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm text-muted-foreground">{complete ? "your page is ready" : "setting up your page"}</span>
                        <h1 className="text-4xl font-bold leading-none tracking-tight sm:text-6xl">{artistName}</h1>
                        <p className="text-base text-muted-foreground">
                            {complete ? "edit anything, and take off anything that isn’t you." : "we’re reading what the web knows about you, so you don’t have to."}
                        </p>
                    </div>
                    {releases && <Suspense fallback={null}><ResearchReleases releases={releases} /></Suspense>}
                </div>

                <ol aria-label="Research steps" className="m-0 list-none p-0">
                    {stages.map((stage, i) => (
                        <ResearchStep key={stage.group} state={stage.state} title={stage.label} last={i === stages.length - 1}>
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
                    ))}
                </ol>
            </main>
        </div>
    );
}
