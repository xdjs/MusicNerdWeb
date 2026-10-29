"use server"

import { getServerAuthSession } from "@/server/auth";
import { getDevSession } from "@/server/utils/dev-auth";
import type { ArtistVaultSource } from "@/server/db/DbTypes";
import {
    getApprovedClaimByUserId,
    getVaultSourcesByArtistId,
    getBioVersionsByArtistId,
    saveBioVersion,
    pinBioVersion,
    deleteBioVersion,
    unpinArtistBio,
} from "@/server/utils/queries/dashboardQueries";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { queueLoreRefresh } from "@/server/utils/queries/loreRefresh";
import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getDocCorrections, upsertDocCorrection, deleteDocCorrection } from "@/server/utils/queries/docCorrectionQueries";
import { claimKey } from "@/lib/source/docClaims";
import { getArtistDoc } from "@/server/utils/queries/onboardingQueries";
import { canEditArtist } from "@/server/utils/artistEditAuth";
import { MAX_BIO_LENGTH } from "@/lib/bio/bioConstants";

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

// ------ Knowledge document ------

const MAX_CORRECTION_CHARS = 2000;

/** The document plus the artist's corrections, for their own review surface.
 *  Read-only and owner-gated: this is our working material about a person, not
 *  something to serve to visitors. */
export async function getKnowledgeDoc(artistId: string): Promise<{
    success: boolean;
    content?: string;
    sources?: unknown[];
    corrections?: Awaited<ReturnType<typeof getDocCorrections>>;
    error?: string;
}> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };
    try {
        const auth = await verifyArtistEditable(session.user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };
        const doc = await getArtistDoc(artistId);
        if (!doc) return { success: true, content: undefined, sources: [], corrections: [] };
        return {
            success: true,
            content: doc.content,
            sources: (doc.sources as unknown[]) ?? [],
            corrections: await getDocCorrections(artistId),
        };
    } catch (error) {
        console.error("[getKnowledgeDoc] Error:", error);
        return { success: false, error: "Failed to load knowledge document" };
    }
}

/**
 * Record that a claim is wrong, or replace it with the artist's own wording.
 *
 * Deliberately does NOT edit the document text. The document is regenerated
 * whenever sources change, so an in-place edit would appear to work and then
 * vanish days later. The correction is stored separately and re-applied on
 * every rebuild — see buildDocContext.
 */
export async function correctDocClaim(
    artistId: string,
    claim: string,
    kind: "wrong" | "fix",
    correction?: string | null,
): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };
    try {
        const auth = await verifyArtistEditable(session.user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };

        // Shared with the client via claimKey — both sides must key on the same
        // string or a correction saves and then never renders as applied.
        const trimmedClaim = claimKey(claim);
        if (!trimmedClaim) return { success: false, error: "No claim given" };
        const trimmedFix = kind === "fix" ? (correction ?? "").trim().slice(0, MAX_CORRECTION_CHARS) : null;
        // A "fix" with nothing in it is a no-op that would silently teach the
        // model to delete the claim — reject it rather than guess.
        if (kind === "fix" && !trimmedFix) return { success: false, error: "Write your correction first" };

        await upsertDocCorrection(artistId, trimmedClaim, kind, trimmedFix, { userId: session.user.id, expectedClaimId: auth.claimId });
        // Rebuild so the artist sees their correction take effect, rather than
        // being told it was saved and watching nothing change.
        await scheduleDocRefresh(artistId, auth.claimId, session.user.id, 'lore_correction');
        return { success: true };
    } catch (error) {
        console.error("[correctDocClaim] Error:", error);
        return { success: false, error: "Failed to save your correction" };
    }
}

/** Undo a correction. The next rebuild stops applying it. */
export async function undoDocCorrection(artistId: string, correctionId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };
    try {
        const auth = await verifyArtistEditable(session.user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };
        await deleteDocCorrection(artistId, correctionId, { userId: session.user.id, expectedClaimId: auth.claimId });
        await scheduleDocRefresh(artistId, auth.claimId, session.user.id, 'lore_correction');
        return { success: true };
    } catch (error) {
        console.error("[undoDocCorrection] Error:", error);
        return { success: false, error: "Failed to undo" };
    }
}

// ------ Bio Versions ------

export async function getArtistBioVersions(targetArtistId?: string): Promise<{ success: boolean; versions?: Awaited<ReturnType<typeof getBioVersionsByArtistId>>; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const resolved = await resolveBioArtistId(session.user.id, targetArtistId);
        if ("error" in resolved) return { success: false, error: resolved.error };

        const versions = await getBioVersionsByArtistId(resolved.artistId);
        return { success: true, versions };
    } catch (error) {
        console.error("[getArtistBioVersions] Error:", error);
        return { success: false, error: "Failed to load bio versions" };
    }
}

export async function saveCurrentBio(bioText: string, targetArtistId?: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    if (!bioText || bioText.length > MAX_BIO_LENGTH) {
        return { success: false, error: `Bio must be between 1 and ${MAX_BIO_LENGTH} characters` };
    }

    try {
        const resolved = await resolveBioArtistId(session.user.id, targetArtistId);
        if ("error" in resolved) return { success: false, error: resolved.error };

        await saveBioVersion(resolved.artistId, bioText, { userId: session.user.id, expectedClaimId: resolved.claimId });
        return { success: true };
    } catch (error) {
        console.error("[saveCurrentBio] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to save bio";
        return { success: false, error: message };
    }
}

/** Resolve the artistId for bio version actions — admin can target any artist via the version's owner */
async function resolveBioArtistId(userId: string, targetArtistId?: string): Promise<{ artistId: string; claimId: string | null } | { error: string }> {
    if (targetArtistId) {
        const auth = await verifyArtistEditable(userId, targetArtistId);
        return auth.ok ? { artistId: targetArtistId, claimId: auth.claimId } : { error: auth.error };
    }
    const claim = await getApprovedClaimByUserId(userId);
    if (!claim) return { error: "No claimed artist profile" };
    return { artistId: claim.artistId, claimId: claim.id };
}

export async function pinBioVersionAction(versionId: string, targetArtistId?: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const resolved = await resolveBioArtistId(session.user.id, targetArtistId);
        if ("error" in resolved) return { success: false, error: resolved.error };

        const pinned = await pinBioVersion(versionId, resolved.artistId, { userId: session.user.id, expectedClaimId: resolved.claimId });
        if (!pinned) return { success: false, error: "Bio version not found" };
        return { success: true };
    } catch (error) {
        console.error("[pinBioVersionAction] Error:", error);
        return { success: false, error: "Failed to pin bio version" };
    }
}

export async function deleteBioVersionAction(versionId: string, targetArtistId?: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: "Not authenticated" };

    try {
        const resolved = await resolveBioArtistId(session.user.id, targetArtistId);
        if ("error" in resolved) return { success: false, error: resolved.error };

        const deleted = await deleteBioVersion(versionId, resolved.artistId, { userId: session.user.id, expectedClaimId: resolved.claimId });
        if (!deleted) return { success: false, error: "Bio version not found" };
        return { success: true };
    } catch (error) {
        console.error("[deleteBioVersionAction] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete bio version";
        return { success: false, error: message };
    }
}

export async function unpinBioAction(artistId: string): Promise<{ success: boolean; error?: string }> {
    const session = await getServerAuthSession() ?? await getDevSession();
    if (!session) return { success: false, error: 'Not authenticated' };
    try {
        const auth = await verifyArtistEditable(session.user.id, artistId);
        if (!auth.ok) return { success: false, error: auth.error };
        await unpinArtistBio(artistId, { userId: session.user.id, expectedClaimId: auth.claimId });
        return { success: true };
    } catch {
        return { success: false, error: 'Could not unpin bio' };
    }
}
