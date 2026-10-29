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
