"use server"

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import {
    createClaim,
    getClaimByArtistId,
    getApprovedClaimByUserId,
    getVaultSourcesByArtistId,
    updateVaultSourceStatus,
    seedMockVaultSources,
    insertVaultSource,
    deleteVaultSource,
    deleteVaultSources,
} from "@/server/utils/queries/dashboardQueries";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";

export async function claimArtistProfile(artistId: string): Promise<{ success: boolean; error?: string; alreadyClaimed?: boolean }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const existing = await getClaimByArtistId(artistId);
        if (existing) {
            return { success: false, alreadyClaimed: true, error: "This artist profile has already been claimed" };
        }

        await createClaim(session.user.id, artistId);

        // Fire web search in background to populate pending vault sources
        searchAndPopulateVault(artistId).catch(e =>
            console.error("[claimArtistProfile] Background web search failed:", e)
        );

        return { success: true };
    } catch (error) {
        console.error("[claimArtistProfile] Error:", error);
        return { success: false, error: "Failed to claim artist profile" };
    }
}

export async function getArtistDashboardData() {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false as const, error: "Not authenticated" };

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) {
            return { success: true as const, claim: null, pendingSources: [], approvedSources: [] };
        }

        const [pendingSources, approvedSources] = await Promise.all([
            getVaultSourcesByArtistId(claim.artistId, "pending"),
            getVaultSourcesByArtistId(claim.artistId, "approved"),
        ]);

        return {
            success: true as const,
            claim: {
                id: claim.id,
                artistId: claim.artistId,
                artistName: claim.artist?.name ?? "Unknown Artist",
            },
            pendingSources,
            approvedSources,
        };
    } catch (error) {
        console.error("[getArtistDashboardData] Error:", error);
        return { success: false as const, error: "Failed to load dashboard data" };
    }
}

export async function updateSourceStatus(
    sourceId: string,
    status: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        // Verify the source belongs to the user's claimed artist
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) return { success: false, error: "No claimed artist profile" };

        await updateVaultSourceStatus(sourceId, status);
        return { success: true };
    } catch (error) {
        console.error("[updateSourceStatus] Error:", error);
        return { success: false, error: "Failed to update source status" };
    }
}

export async function seedMockSources(artistId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        // Verify ownership
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim || claim.artistId !== artistId) {
            return { success: false, error: "Not authorized for this artist" };
        }

        await seedMockVaultSources(artistId);
        return { success: true };
    } catch (error) {
        console.error("[seedMockSources] Error:", error);
        return { success: false, error: "Failed to seed mock sources" };
    }
}

export async function searchWebForSources(artistId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim || claim.artistId !== artistId) {
            return { success: false, error: "Not authorized for this artist" };
        }

        const count = await searchAndPopulateVault(artistId);
        return { success: true, count };
    } catch (error) {
        console.error("[searchWebForSources] Error:", error);
        return { success: false, error: "Failed to search for sources" };
    }
}

export async function addVaultSource(
    artistId: string,
    url: string
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim || claim.artistId !== artistId) {
            return { success: false, error: "Not authorized for this artist" };
        }

        // Extract a title from the URL domain
        let title = "Untitled Source";
        try {
            const parsed = new URL(url);
            title = `Source from ${parsed.hostname.replace("www.", "")}`;
        } catch { /* keep default */ }

        await insertVaultSource({
            artistId,
            url,
            title,
            status: "pending",
        });
        return { success: true };
    } catch (error) {
        console.error("[addVaultSource] Error:", error);
        return { success: false, error: "Failed to add source" };
    }
}

export async function removeVaultSource(
    sourceId: string
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) return { success: false, error: "No claimed artist profile" };

        await deleteVaultSource(sourceId);
        return { success: true };
    } catch (error) {
        console.error("[removeVaultSource] Error:", error);
        return { success: false, error: "Failed to delete source" };
    }
}

export async function removeVaultSources(
    sourceIds: string[]
): Promise<{ success: boolean; count?: number; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) return { success: false, error: "No claimed artist profile" };

        const deleted = await deleteVaultSources(sourceIds);
        return { success: true, count: deleted.length };
    } catch (error) {
        console.error("[removeVaultSources] Error:", error);
        return { success: false, error: "Failed to delete sources" };
    }
}
