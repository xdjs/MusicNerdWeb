"use server"

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import {
    createClaim,
    getClaimByArtistId,
    getApprovedClaimByUserId,
    getVaultSourcesByArtistId,
    updateVaultSourceStatus,
    updateVaultSourceType,
    seedMockVaultSources,
    insertVaultSource,
    deleteVaultSource,
    deleteVaultSources,
    deleteClaim,
} from "@/server/utils/queries/dashboardQueries";
import { inferTypeFromUrl, SOURCE_TYPES } from "@/lib/sourceTypes";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { generateArtistBio } from "@/server/utils/queries/artistBioQuery";
import { fetchPageContent } from "@/server/utils/fetchPageContent";
import { updateVaultSourceContent } from "@/server/utils/queries/dashboardQueries";
import { generateReferenceCode } from "@/lib/referenceCode";
import { sendDiscordMessage } from "@/server/utils/queries/discord";

// Best-effort debounce for bio regen (same serverless caveat as rate limiting)
const bioRegenTimestamps = new Map<string, number>();
const BIO_REGEN_DEBOUNCE_MS = 30_000;

export async function claimArtistProfile(artistId: string): Promise<{ success: boolean; error?: string; alreadyClaimed?: boolean; referenceCode?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const existing = await getClaimByArtistId(artistId);
        if (existing) {
            // Allow re-claim if previously rejected (delete old claim first due to UNIQUE constraint)
            if (existing.status === "rejected") {
                await deleteClaim(existing.id);
            } else {
                return { success: false, alreadyClaimed: true, error: "This artist profile has already been claimed" };
            }
        }

        const referenceCode = generateReferenceCode();
        await createClaim(session.user.id, artistId, referenceCode);

        // Notify admins via Discord
        sendDiscordMessage(
            `New claim request: ${referenceCode} | Artist ID: ${artistId} | User: ${session.user.email ?? session.user.id}`
        ).catch(e => console.error("[claimArtistProfile] Discord notify failed:", e));

        return { success: true, referenceCode };
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

        // Regenerate bio in the background when a source is approved (debounced)
        if (status === "approved" && claim.artistId) {
            const now = Date.now();
            const lastRegen = bioRegenTimestamps.get(claim.artistId) ?? 0;
            if (now - lastRegen > BIO_REGEN_DEBOUNCE_MS) {
                bioRegenTimestamps.set(claim.artistId, now);
                generateArtistBio(claim.artistId).catch(e =>
                    console.error("[updateSourceStatus] Background bio regeneration failed:", e)
                );
            } else {
                console.log(`[updateSourceStatus] Skipping bio regen for ${claim.artistId} — debounced`);
            }
        }

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

        // Insert immediately with domain-based title, then fetch content in background
        let title = "Untitled Source";
        try {
            const parsed = new URL(url);
            title = `Source from ${parsed.hostname.replace("www.", "")}`;
        } catch {
            // malformed URL — use default title
        }

        const source = await insertVaultSource({
            artistId,
            url,
            title,
            type: inferTypeFromUrl(url),
            status: "pending",
        });

        // Fire background content fetch to populate real title/snippet/extractedText
        if (source?.id) {
            fetchPageContent(url).then(content => {
                updateVaultSourceContent(source.id, {
                    title: content.title,
                    snippet: content.snippet,
                    extractedText: content.extractedText,
                }).catch(e => console.error("[addVaultSource] Background content update failed:", e));
            }).catch(e => console.error("[addVaultSource] Background fetch failed:", e));
        }

        return { success: true };
    } catch (error) {
        console.error("[addVaultSource] Error:", error);
        return { success: false, error: "Failed to add source" };
    }
}

export async function updateSourceType(
    sourceId: string,
    type: string
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    if (!SOURCE_TYPES.includes(type as typeof SOURCE_TYPES[number])) {
        return { success: false, error: "Invalid source type" };
    }

    try {
        const claim = await getApprovedClaimByUserId(session.user.id);
        if (!claim) return { success: false, error: "No claimed artist profile" };

        await updateVaultSourceType(sourceId, type);
        return { success: true };
    } catch (error) {
        console.error("[updateSourceType] Error:", error);
        return { success: false, error: "Failed to update source type" };
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
