"use server"

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import type { ArtistVaultSource } from "@/server/db/DbTypes";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { canEditArtist } from "@/server/utils/artistEditAuth";

/** Authorize editing a specific artist: admins may edit any, owners only their claimed artist. */
async function verifyArtistEditable(userId: string, artistId: string): Promise<{ ok: true; claimId: string | null } | { ok: false; error: string }> {
    const claimId = await getLoreClaimGeneration(artistId);
    return (await canEditArtist(userId, artistId)) ? { ok: true, claimId } : { ok: false, error: "Not authorized for this artist" };
}

export async function updateSourceStatus(
    sourceId: string,
    status: "approved" | "rejected",
    expectedStatus?: "pending",
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const ownership = await verifySourceEditable(session.user.id, sourceId);
        if (!ownership.authorized) return { success: false, error: ownership.error };

        const updated = await withArtistOperation(ownership.artistId,
            { userId: session.user.id, expectedClaimId: ownership.claimId, trigger: 'source_review' },
            () => expectedStatus ? updateVaultSourceStatus(sourceId, status, expectedStatus) : updateVaultSourceStatus(sourceId, status));
        if (expectedStatus && !updated) {
            return { success: false, error: "This Lore source was already reviewed. Refresh the queue to see its current status." };
        }

        // The document follows the sources in BOTH directions. Approving is not
        // the only change that matters: rejecting a source the document cites is
        // exactly the case the artist is trying to fix.
        await scheduleDocRefresh(ownership.artistId, ownership.claimId, session.user.id, 'source_change');

        return { success: true };
    } catch (error) {
        console.error("[updateSourceStatus] Error:", error);
        return { success: false, error: "Failed to update source status" };
    }
}

export async function searchWebForSources(artistId: string): Promise<{ success: boolean; count?: number; sources?: ArtistVaultSource[]; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const auth = await verifyArtistEditable(session.user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };

        const sources = await searchAndPopulateVault(artistId, { ownership: { userId: session.user.id, expectedClaimId: auth.claimId, trigger: 'editor_search' } });
        return { success: true, count: sources.length, sources };
    } catch (error) {
        console.error("[searchWebForSources] Error:", error);
        return { success: false, error: "Failed to search for sources" };
    }
}
