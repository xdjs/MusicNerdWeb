"use client";

import { useState } from "react";
import ProfileTour from "@/app/artist/[id]/_components/onboarding/ProfileTour";
import { armTour } from "@/app/artist/[id]/_components/onboarding/armTour";
import { tourFlagKey } from "@/app/artist/[id]/_components/onboarding/tourFlagKey";

/** Preview deployments only: use real saved links without restarting research. */
export default function ProfileTourPreview({ artistId, hasSupportLinks }: { artistId: string; hasSupportLinks: boolean }) {
    const [revision, setRevision] = useState(0);
    // Keep testing separate from the artist's real tour-completion preference.
    const previewId = `preview:${artistId}`;

    return (
        <>
            <div className="rounded-xl border p-4 space-y-2 text-foreground">
                <p className="font-semibold">Preview: post-research tour</p>
                <p className="text-sm">Uses this profile&apos;s saved links. Research and profile data stay unchanged.</p>
                <button type="button" className="button-pink bg-highlightpink text-black rounded-lg px-4 py-2 font-semibold"
                    onClick={() => {
                        try { sessionStorage.removeItem(tourFlagKey(previewId)); } catch { /* private mode */ }
                        armTour(previewId);
                        setRevision(value => value + 1);
                    }}>
                    Start tour preview
                </button>
            </div>
            <ProfileTour key={`${previewId}:${revision}`} artistId={previewId} hasSupportLinks={hasSupportLinks} />
        </>
    );
}
