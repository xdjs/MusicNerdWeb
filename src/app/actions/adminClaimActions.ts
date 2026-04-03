"use server"

import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { approveClaim, rejectClaim, deleteClaim, getAllClaims } from "@/server/utils/queries/dashboardQueries";
import { searchAndPopulateVault } from "@/server/utils/queries/vaultWebSearch";
import { sendDiscordMessage } from "@/server/utils/queries/discord";
import { logMcpAudit } from "@/app/api/mcp/audit";

async function requireAdminSession() {
    const session = await getServerAuthSession();
    if (!session?.user?.id) return null;
    const user = await getUserById(session.user.id);
    if (!user?.isAdmin) return null;
    return session;
}

export async function getAdminAllClaims() {
    const session = await requireAdminSession();
    if (!session) return [];
    return getAllClaims();
}

export async function approveClaimAction(claimId: string): Promise<{ success: boolean; error?: string }> {
    const session = await requireAdminSession();
    if (!session) return { success: false, error: "Not authorized" };

    try {
        const claim = await approveClaim(claimId);
        if (!claim) return { success: false, error: "Claim not found" };

        searchAndPopulateVault(claim.artistId).catch(e =>
            console.error("[approveClaimAction] Background web search failed:", e)
        );

        sendDiscordMessage(
            `Claim APPROVED: ${claim.referenceCode} | Artist ID: ${claim.artistId} | Approved by: ${session.user.email ?? session.user.id}`
        ).catch(e => console.error("[approveClaimAction] Discord notify failed:", e));

        return { success: true };
    } catch (error) {
        console.error("[approveClaimAction] Error:", error);
        return { success: false, error: "Failed to approve claim" };
    }
}

export async function rejectClaimAction(claimId: string): Promise<{ success: boolean; error?: string }> {
    const session = await requireAdminSession();
    if (!session) return { success: false, error: "Not authorized" };

    try {
        const claim = await rejectClaim(claimId);
        if (!claim) return { success: false, error: "Claim not found" };

        sendDiscordMessage(
            `Claim REJECTED: ${claim.referenceCode} | Artist ID: ${claim.artistId} | Rejected by: ${session.user.email ?? session.user.id}`
        ).catch(e => console.error("[rejectClaimAction] Discord notify failed:", e));

        return { success: true };
    } catch (error) {
        console.error("[rejectClaimAction] Error:", error);
        return { success: false, error: "Failed to reject claim" };
    }
}

/** Hard-deletes the claim row. Intentional — allows the artist to be re-claimed.
 *  Audit persisted to mcp_audit_log + Discord notification. */
export async function revokeClaimAction(claimId: string): Promise<{ success: boolean; error?: string }> {
    const session = await requireAdminSession();
    if (!session) return { success: false, error: "Not authorized" };

    try {
        const claim = await deleteClaim(claimId);
        if (!claim) return { success: false, error: "Claim not found" };

        // Persist audit before Discord (DB is more reliable than webhook)
        logMcpAudit({
            artistId: claim.artistId,
            field: "claim",
            action: "delete",
            oldValue: `${claim.status}|${claim.referenceCode}`,
            newValue: null,
            apiKeyHash: `admin:${session.user.id}`,
        }).catch(e => console.error("[revokeClaimAction] Audit log failed:", e));

        sendDiscordMessage(
            `Claim REVOKED: ${claim.referenceCode} | Artist ID: ${claim.artistId} | Revoked by: ${session.user.email ?? session.user.id}`
        ).catch(e => console.error("[revokeClaimAction] Discord notify failed:", e));

        return { success: true };
    } catch (error) {
        console.error("[revokeClaimAction] Error:", error);
        return { success: false, error: "Failed to revoke claim" };
    }
}
