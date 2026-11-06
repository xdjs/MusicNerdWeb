"use client";

import { useState, type ReactNode } from "react";
import type { OnboardingStateView } from "@/lib/onboarding/onboardingStateTypes";
import ResearchInPlace, { type ResearchItems } from "./ResearchInPlace";
import { armTour } from "@/app/artist/[id]/_components/onboarding/armTour";
import { tourFlagKey } from "@/app/artist/[id]/_components/onboarding/tourFlagKey";

type Props = {
    artistId: string;
    /** The onboarding state the page rendered with, from MusicNerdAPI (docs/research-view.md). */
    state: OnboardingStateView;
    /** The profile links and approved sources the page shows now (what counts as new). */
    researchItems?: ResearchItems;
    /** The artist page. While MusicNerdAPI builds it, research paints it in place
     *  (docs/research-view.md); otherwise it's shown as usual. */
    children?: ReactNode;
};

const NO_ITEMS: ResearchItems = { links: [], sources: [] };

/**
 * The claimant's page while the server builds it. The build runs on
 * MusicNerdAPI from claim approval, so this only watches it. The page renders
 * the gate for the claimant whatever the state, so a build that completes
 * during the visit keeps its view (docs/research-view.md, "Done"); a page that
 * arrived complete has nothing to show here.
 */
export default function OnboardingGate({ artistId, state, researchItems = NO_ITEMS, children }: Props) {
    const [completeOnArrival] = useState(state.complete);
    if (completeOnArrival) return <>{children}</>;

    // The build finished while the artist watched: arm the tour but keep the
    // page as it is, with the new-item marks. Arming (not rendering) survives
    // the server re-fetch that follows completion.
    const armTourOnce = () => {
        let alreadyDone = false;
        try { alreadyDone = sessionStorage.getItem(tourFlagKey(artistId)) === "1"; } catch { /* private mode */ }
        if (!alreadyDone) armTour(artistId);
    };

    return (
        <ResearchInPlace artistId={artistId} initialState={state} researchItems={researchItems} onComplete={armTourOnce}>
            {children}
        </ResearchInPlace>
    );
}
