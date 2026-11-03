"use server"

import type { ArtistVaultSource } from "@/server/db/DbTypes";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { verifyPrivyToken } from "@/server/utils/privy";
import { getUserByPrivyId } from "@/server/utils/queries/userQueries";

/** Authorize editing a specific artist: admins may edit any, owners only their claimed artist. */
async function verifyArtistEditable(userId: string, artistId: string): Promise<{ ok: true; claimId: string | null } | { ok: false; error: string }> {
    const claimId = await getLoreClaimGeneration(artistId);
    return (await canEditArtist(userId, artistId)) ? { ok: true, claimId } : { ok: false, error: "Not authorized for this artist" };
}

/**
 * Search the web for new Lore sources for an artist. The caller is the holder
 * of the Privy access token; it moves to MusicNerdAPI with xdjs/MusicNerdWeb#1589.
 */
export async function searchWebForSources(artistId: string, accessToken: string | null): Promise<{ success: boolean; count?: number; sources?: ArtistVaultSource[]; error?: string }> {
    const privyUser = accessToken ? await verifyPrivyToken(accessToken) : null;
    const user = privyUser ? await getUserByPrivyId(privyUser.userId) : null;
    if (!user) return { success: false, error: "Not authenticated" };

    try {
        const auth = await verifyArtistEditable(user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };

        const sources = await searchAndPopulateVault(artistId, { ownership: { userId: user.id, expectedClaimId: auth.claimId, trigger: 'editor_search' } });
        return { success: true, count: sources.length, sources };
    } catch (error) {
        console.error("[searchWebForSources] Error:", error);
        return { success: false, error: "Failed to search for sources" };
    }
}
