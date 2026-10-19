"use client";

import { useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { restartClaimBuild } from "@/lib/onboarding/restartClaimBuild";

/**
 * The research view's "Try again": restarts the server build as the signed-in
 * claimant.
 *
 * @param artistId - The artist.
 * @returns A function that restarts the build and says whether the API accepted it.
 */
export function useRestartClaimBuild(artistId: string): () => Promise<boolean> {
    const { getAccessToken } = usePrivy();
    return useCallback(async () => {
        const token = (await getAccessToken())?.trim();
        if (!token) return false;
        return restartClaimBuild(artistId, token);
    }, [artistId, getAccessToken]);
}
