"use server"

import { getServerAuthSession } from "@/server/auth";
import { getUserById } from "@/server/utils/queries/userQueries";
import { approveClaim, rejectClaim, getAllClaims, getClaimById, revokeApprovedClaim } from "@/server/utils/queries/dashboardQueries";
import { hasReusableDirectoryDiscovery } from "@/server/utils/queries/hasReusableDirectoryDiscovery";
import { enqueueClaimInterview } from '@/server/utils/queries/enqueueClaimInterview';
import { startClaimBuild } from '@/server/utils/onboarding/startClaimBuild';
import { enqueueResearchJob } from "@/server/utils/queries/researchJobQueries";
import { withArtistOperation } from '@/server/utils/artistOperationContext';
import { sendDiscordMessage } from "@/server/utils/queries/discord";
import { sendClaimApprovedEmail } from "@/server/utils/email";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { logMcpAudit } from "@/server/utils/logMcpAudit";

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

export async function approveClaimAction(claimId: string): Promise<{ success: boolean; error?: string; warning?: string }> {
    const session = await requireAdminSession();
    if (!session) return { success: false, error: "Not authorized" };

    try {
        const claim = await approveClaim(claimId);
        if (!claim) return { success: false, error: "Claim not found" };

        // Approval has committed. A failed enqueue must reach the admin without
        // pretending approval rolled back or skipping the claimant's notification.
        let researchReady = false;
        try {
            researchReady = await hasReusableDirectoryDiscovery(claim.artistId, claim.id);
        } catch (error) {
            // A failed reuse check must fall back to normal discovery.
            console.error('[approveClaimAction] Discovery handoff check failed:', error);
        }
        if (!researchReady) {
            try {
                researchReady = await withArtistOperation(claim.artistId,
                    { userId: session.user.id, expectedClaimId: claim.id, trigger: 'claim_approval' },
                    () => enqueueResearchJob(claim.artistId, 'source_search', { state: { claimId: claim.id } }));
            } catch (error) {
                console.error('[approveClaimAction] Source research enqueue failed:', error);
            }
        }

        let interviewReady = true;
        try {
            interviewReady = await withArtistOperation(claim.artistId,
                { userId: session.user.id, expectedClaimId: claim.id, trigger: 'claim_approval' },
                () => enqueueClaimInterview(claim.artistId, claim.id, claim.userId));
        } catch (error) {
            interviewReady = false;
            console.error('[approveClaimAction] Interview preparation enqueue failed:', error);
        }

        // The page builds on MusicNerdAPI as a durable workflow; the artist page
        // only watches it (docs/research-view.md). A failed start is retried
        // from the page's "Try again".
        let buildStarted = false;
        try {
            buildStarted = await startClaimBuild(claim.artistId);
        } catch (error) {
            console.error('[approveClaimAction] Page build start failed:', error);
        }

        // Approval email — AWAITED (not fire-and-forget). On Vercel a serverless
        // lambda can freeze immediately after the action returns, so a floating
        // promise here may never actually send. sendEmail/sendClaimApprovedEmail
        // are documented to never throw, but the try/catch here is defense in
        // depth anyway: approval must NEVER fail because of email, and it already
        // committed to the DB above. The null-email guard still skips legacy
        // wallet users. The on-page banner remains the fallback channel either way.
        try {
            const [claimUser, artist] = await Promise.all([
                getUserById(claim.userId),
                getArtistById(claim.artistId),
            ]);
            if (!claimUser?.email) {
                console.log(`[approveClaimAction] No email for user ${claim.userId} — skipping approval email`);
            } else {
                await sendClaimApprovedEmail(claimUser.email, artist?.name ?? null, claim.artistId);
            }
        } catch (e) {
            console.error("[approveClaimAction] Approval email failed:", e);
        }

        sendDiscordMessage(
            `Claim APPROVED: ${claim.referenceCode} | Artist ID: ${claim.artistId} | Approved by: ${session.user.email ?? session.user.id}`
        ).catch(e => console.error("[approveClaimAction] Discord notify failed:", e));

        return {
            success: true,
            ...(!interviewReady && researchReady ? { warning: 'Claim approved, but interview preparation could not be queued. The artist can still prepare an interview from their profile.' } : {}),
            ...(!researchReady ? { warning: 'Claim approved, but source research could not be queued. Open the artist’s Lore and use “Search web for sources” to retry.' } : {}),
            ...(!buildStarted && researchReady && interviewReady ? { warning: 'Claim approved, but the page build could not start. It restarts when the artist taps “Try again” on their page.' } : {}),
        };
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

/** Revoke claimant content while preserving verified trusted contributions. */
export async function revokeClaimAction(claimId: string): Promise<{ success: boolean; error?: string; warning?: string }> {
    const session = await requireAdminSession();
    if (!session) return { success: false, error: "Not authorized" };

    try {
        // Preflight for friendlier errors. The transaction below re-checks status='approved'
        // so a race between preflight and commit can only make revoke fail, never succeed on
        // the wrong state.
        const existing = await getClaimById(claimId);
        if (!existing) return { success: false, error: "Claim not found" };
        if (existing.status !== "approved") return { success: false, error: "Can only revoke approved claims" };

        // Atomic: delete vault sources + claim in one transaction.
        const claim = await revokeApprovedClaim(claimId, session.user.id);
        if (!claim) return { success: false, error: "Claim is no longer approved" };

        // Storage keys can be reused by in-flight completion. Even exact-path
        // deletion is unsafe until the API fences object generations. The DB
        // transaction records deferred cleanup; never list/purge artist prefixes.

        // Persist audit before Discord (DB is more reliable than webhook)
        // apiKeyHash uses "admin:<userId>" convention for admin-initiated actions
        // (distinct from MCP SHA-256 key hashes which are hex strings)
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

        return { success: true, warning: "Claim revoked. Uploaded files were retained; safe storage cleanup requires separate review." };
    } catch (error) {
        console.error("[revokeClaimAction] Error:", error);
        return { success: false, error: error instanceof Error && error.message === "REVOCATION_SOURCE_REVIEW_REQUIRED"
            ? "Revocation needs source-retention review because some Lore provenance is unknown. No changes were made."
            : "Could not confirm claim revocation. Refresh and check the claim status before retrying." };
    }
}
