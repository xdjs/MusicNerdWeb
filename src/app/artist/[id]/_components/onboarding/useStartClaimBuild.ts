"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { restartClaimBuild } from "@/lib/onboarding/restartClaimBuild";

/**
 * Starts the server build once when the claimant opens an unfinished page,
 * in case nothing started it (a claim approved before the build moved to the
 * server, a failed start at approval, or a preview without the research key).
 * Safe to repeat: a build already running is left alone, and a stopped one
 * resumes at its first unconfirmed step (docs/research-view.md).
 *
 * @param artistId - The artist.
 */
export function useStartClaimBuild(artistId: string): void {
    const { ready, authenticated, getAccessToken } = usePrivy();
    const started = useRef(false);
    useEffect(() => {
        if (!ready || !authenticated || started.current) return;
        started.current = true;
        void (async () => {
            const token = (await getAccessToken())?.trim();
            if (token) await restartClaimBuild(artistId, token);
        })();
    }, [artistId, ready, authenticated, getAccessToken]);
}
