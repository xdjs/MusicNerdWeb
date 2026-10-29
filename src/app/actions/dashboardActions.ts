"use server"

import { withArtistOperation } from '@/server/utils/artistOperationContext';

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import type { ArtistVaultSource } from "@/server/db/DbTypes";
import {
    createClaim,
    getClaimByArtistId,
    getVaultSourcesByArtistId,
    getVaultSourceById,
    updateVaultSourceStatus,
    updateVaultSourceType,
    deleteVaultSource,
    deleteVaultSources,
} from "@/server/utils/queries/dashboardQueries";
import { SOURCE_TYPES } from "@/lib/source/sourceTypes";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { queueLoreRefresh } from "@/server/utils/queries/loreRefresh";
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { generateReferenceCode } from "@/lib/referenceCode";
import { sendDiscordMessage } from "@/server/utils/queries/discord";
import { canEditArtist } from "@/server/utils/artistEditAuth";

// Durable jobs coalesce changes across workers and survive request completion.
async function scheduleDocRefresh(artistId: string | undefined, expectedClaimId: string | null, userId: string, trigger: string): Promise<void> {
    if (!artistId) return;
    try { await queueLoreRefresh(artistId, expectedClaimId, { userId, trigger }); }
    catch (error) {
        // The source mutation is already committed. Never report it as failed:
        // Look again can retry the derived-document refresh independently.
        console.error('[vault] Source saved but Lore enqueue failed', error);
    }
}

export async function claimArtistProfile(artistId: string): Promise<{ success: boolean; error?: string; alreadyClaimed?: boolean; referenceCode?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        // getClaimByArtistId is scoped to ACTIVE claims (pending|approved) since
        // migration 0007 — rejected claims persist for audit but never block
        // re-claim. No need to delete-then-insert anymore.
        const existing = await getClaimByArtistId(artistId);
        if (existing) {
            return { success: false, alreadyClaimed: true, error: "This artist profile has already been claimed" };
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

/** Resolve a source the user may edit: admins can edit any source, owners only their claimed artist's. Returns the source's artistId. */
async function verifySourceEditable(userId: string, sourceId: string) {
    const source = await getVaultSourceById(sourceId);
    if (!source) return { authorized: false as const, error: "Source not found" };
    const claimId = await getLoreClaimGeneration(source.artistId);
    if (await canEditArtist(userId, source.artistId)) {
        return { authorized: true as const, artistId: source.artistId, claimId, source };
    }
    return { authorized: false as const, error: "Not authorized for this source" };
}

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
        const ownership = await verifySourceEditable(session.user.id, sourceId);
        if (!ownership.authorized) return { success: false, error: ownership.error };

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
        const ownership = await verifySourceEditable(session.user.id, sourceId);
        if (!ownership.authorized) return { success: false, error: ownership.error };

        await deleteVaultSource(sourceId);
        await scheduleDocRefresh(ownership.artistId, ownership.claimId, session.user.id, 'source_change');
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
        if (sourceIds.length === 0) return { success: true, count: 0 };

        // Multi-claim-safe: resolve each source's artist directly, then verify the
        // user may edit THAT specific artist (admin or claimant). Previously this
        // path used getApprovedClaimByUserId (single-claim) which would silently
        // misbehave if a user ever held two approved claims — sources for the
        // "wrong" artist would either be rejected or, worse, operated on under
        // an unrelated claim.
        const sources = await Promise.all(
            sourceIds.map(id => getVaultSourceById(id))
        );

        const missing = sources.findIndex(s => !s);
        if (missing >= 0) {
            return { success: false, error: "One or more sources not found" };
        }

        const artistIds = [...new Set(sources.map(s => s!.artistId))];
        const claimIds = await Promise.all(artistIds.map(getLoreClaimGeneration));
        const authz = await Promise.all(
            artistIds.map(id => canEditArtist(session.user.id, id))
        );
        if (authz.some(ok => !ok)) {
            return { success: false, error: "Not authorized for one or more sources" };
        }

        const deleted = await deleteVaultSources(sourceIds);
        await Promise.all(artistIds.map((id, index) => scheduleDocRefresh(id, claimIds[index]!, session.user.id, 'source_change')));
        return { success: true, count: deleted.length };
    } catch (error) {
        console.error("[removeVaultSources] Error:", error);
        return { success: false, error: "Failed to delete sources" };
    }
}
