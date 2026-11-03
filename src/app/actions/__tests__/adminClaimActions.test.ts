// @ts-nocheck
jest.mock('@/server/utils/queries/enqueueClaimInterview', () => ({ enqueueClaimInterview: jest.fn().mockResolvedValue(true) }));
jest.mock('@/server/utils/onboarding/startClaimBuild', () => ({ startClaimBuild: jest.fn().mockResolvedValue(true) }));
import { jest } from "@jest/globals";

jest.mock("@/server/auth", () => ({
    getServerAuthSession: jest.fn(),
}));
jest.mock("@/server/utils/queries/userQueries", () => ({
    getUserById: jest.fn(),
}));
jest.mock("@/server/utils/queries/dashboardQueries", () => ({
    approveClaim: jest.fn(),
    rejectClaim: jest.fn(),
    deleteClaim: jest.fn(),
    getAllClaims: jest.fn(),
    getClaimById: jest.fn(),
    revokeApprovedClaim: jest.fn(),
}));
jest.mock("@/server/utils/queries/hasReusableDirectoryDiscovery", () => ({
    hasReusableDirectoryDiscovery: jest.fn().mockResolvedValue(false),
}));
jest.mock("@/server/utils/queries/researchJobQueries", () => ({
    enqueueResearchJob: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/server/utils/queries/discord", () => ({
    sendDiscordMessage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/server/utils/logMcpAudit", () => ({
    logMcpAudit: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/server/lib/supabase", () => {
    const list = jest.fn().mockResolvedValue({ data: [], error: null });
    const remove = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn(() => ({ list, remove }));
    return {
        getSupabaseAdmin: jest.fn(() => ({ storage: { from } })),
        VAULT_BUCKET: "vault-files",
        __storageMocks: { list, remove, from },
    };
});

describe("adminClaimActions", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    async function setup() {
        const { getServerAuthSession } = await import("@/server/auth");
        const { getUserById } = await import("@/server/utils/queries/userQueries");
        const { approveClaim, rejectClaim, deleteClaim, getAllClaims, getClaimById, revokeApprovedClaim } = await import("@/server/utils/queries/dashboardQueries");
        const { enqueueResearchJob } = await import("@/server/utils/queries/researchJobQueries");
        const { hasReusableDirectoryDiscovery } = await import("@/server/utils/queries/hasReusableDirectoryDiscovery");
        const supabaseMod = await import("@/server/lib/supabase");
        const storageMocks = (supabaseMod as any).__storageMocks;
        const { approveClaimAction, rejectClaimAction, revokeClaimAction, getAdminAllClaims } = await import("../adminClaimActions");

        return {
            getServerAuthSession: getServerAuthSession as jest.Mock,
            getUserById: getUserById as jest.Mock,
            approveClaim: approveClaim as jest.Mock,
            rejectClaim: rejectClaim as jest.Mock,
            deleteClaim: deleteClaim as jest.Mock,
            getAllClaims: getAllClaims as jest.Mock,
            getClaimById: getClaimById as jest.Mock,
            revokeApprovedClaim: revokeApprovedClaim as jest.Mock,
            enqueueResearchJob: enqueueResearchJob as jest.Mock,
            hasReusableDirectoryDiscovery: hasReusableDirectoryDiscovery as jest.Mock,
            storageList: storageMocks.list as jest.Mock,
            storageRemove: storageMocks.remove as jest.Mock,
            storageFrom: storageMocks.from as jest.Mock,
            approveClaimAction,
            rejectClaimAction,
            revokeClaimAction,
            getAdminAllClaims,
        };
    }

    function mockAdmin(mocks: { getServerAuthSession: jest.Mock; getUserById: jest.Mock }) {
        mocks.getServerAuthSession.mockResolvedValue({ user: { id: "admin-1", email: "admin@test.com" } });
        mocks.getUserById.mockResolvedValue({ id: "admin-1", isAdmin: true });
    }

    function mockNonAdmin(mocks: { getServerAuthSession: jest.Mock; getUserById: jest.Mock }) {
        mocks.getServerAuthSession.mockResolvedValue({ user: { id: "user-1", email: "user@test.com" } });
        mocks.getUserById.mockResolvedValue({ id: "user-1", isAdmin: false });
    }

    describe("approveClaimAction", () => {
        it("reuses only a verified discovery checkpoint without an enqueue warning", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: 'c1', artistId: 'a1', userId: 'u1', referenceCode: 'MN-TEST' });
            m.hasReusableDirectoryDiscovery.mockResolvedValue(true);
            expect(await m.approveClaimAction('c1')).toEqual({ success: true });
            expect(m.hasReusableDirectoryDiscovery).toHaveBeenCalledWith('a1', 'c1');
            expect(m.enqueueResearchJob).not.toHaveBeenCalled();
            const { enqueueClaimInterview } = await import('@/server/utils/queries/enqueueClaimInterview');
            expect(enqueueClaimInterview).toHaveBeenCalledWith('a1', 'c1', 'u1');
            const { sendDiscordMessage } = await import('@/server/utils/queries/discord');
            expect(sendDiscordMessage).toHaveBeenCalledWith(expect.stringContaining('Claim APPROVED'));
        });

        it("falls back to normal research if checkpoint validation fails operationally", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: 'c1', artistId: 'a1', userId: 'u1', referenceCode: 'MN-TEST' });
            m.hasReusableDirectoryDiscovery.mockRejectedValue(new Error('checkpoint read unavailable'));
            m.enqueueResearchJob.mockResolvedValue(true);
            expect(await m.approveClaimAction('c1')).toEqual({ success: true });
            expect(m.hasReusableDirectoryDiscovery).toHaveBeenCalledWith('a1', 'c1');
            expect(m.enqueueResearchJob).toHaveBeenCalledWith('a1', 'source_search', { state: { claimId: 'c1' } });
        });

        it.each(['false', 'throw'])('reports approval separately when research enqueue returns %s', async failure => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: 'c1', artistId: 'a1', userId: 'u1', referenceCode: 'MN-TEST' });
            if (failure === 'throw') m.enqueueResearchJob.mockRejectedValue(new Error('queue unavailable'));
            else m.enqueueResearchJob.mockResolvedValue(false);
            const result = await m.approveClaimAction('c1');
            expect(result.success).toBe(true);
            expect(result.warning).toContain('Claim approved');
            expect(result.warning).toContain('Search web for sources');
            const { sendDiscordMessage } = await import('@/server/utils/queries/discord');
            expect(sendDiscordMessage).toHaveBeenCalledWith(expect.stringContaining('Claim APPROVED'));
        });

        it("starts the page build on the server once the claim is approved", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: 'c1', artistId: 'a1', userId: 'u1', referenceCode: 'MN-TEST' });
            expect(await m.approveClaimAction('c1')).toEqual({ success: true });
            const { startClaimBuild } = await import('@/server/utils/onboarding/startClaimBuild');
            expect(startClaimBuild).toHaveBeenCalledWith('a1');
        });

        it.each(['false', 'throw'])('still approves, with a warning, when the build start returns %s', async failure => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: 'c1', artistId: 'a1', userId: 'u1', referenceCode: 'MN-TEST' });
            const { startClaimBuild } = await import('@/server/utils/onboarding/startClaimBuild');
            if (failure === 'throw') (startClaimBuild as jest.Mock).mockRejectedValueOnce(new Error('api down'));
            else (startClaimBuild as jest.Mock).mockResolvedValueOnce(false);
            const result = await m.approveClaimAction('c1');
            expect(result.success).toBe(true);
            expect(result.warning).toContain('page build could not start');
            const { sendDiscordMessage } = await import('@/server/utils/queries/discord');
            expect(sendDiscordMessage).toHaveBeenCalledWith(expect.stringContaining('Claim APPROVED'));
        });

        it("approves a claim and triggers vault population", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: "c1", artistId: "a1", referenceCode: "MN-TEST" });

            const result = await m.approveClaimAction("c1");
            expect(result.success).toBe(true);
            expect(m.approveClaim).toHaveBeenCalledWith("c1");
            expect(m.enqueueResearchJob).toHaveBeenCalledWith("a1", "source_search", { state: { claimId: "c1" } });
        });

        it("rejects non-admin", async () => {
            const m = await setup();
            mockNonAdmin(m);

            const result = await m.approveClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Not authorized");
        });

        it("returns error when claim not found", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue(undefined);

            const result = await m.approveClaimAction("nonexistent");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Claim not found");
        });
    });

    describe("rejectClaimAction", () => {
        it("rejects a claim when admin", async () => {
            const m = await setup();
            mockAdmin(m);
            m.rejectClaim.mockResolvedValue({ id: "c1", artistId: "a1", referenceCode: "MN-TEST" });

            const result = await m.rejectClaimAction("c1");
            expect(result.success).toBe(true);
            expect(m.rejectClaim).toHaveBeenCalledWith("c1");
        });

        it("rejects non-admin", async () => {
            const m = await setup();
            mockNonAdmin(m);

            const result = await m.rejectClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Not authorized");
        });
    });

    describe("revokeClaimAction", () => {
        it("revokes without touching mutable storage keys, including concurrent replacement uploads", async () => {
            const m = await setup();
            mockAdmin(m);
            m.getClaimById.mockResolvedValue({ id: "c1", artistId: "a1", status: "approved" });
            m.revokeApprovedClaim.mockResolvedValue({ id: "c1", artistId: "a1", status: "approved" });
            const result = await m.revokeClaimAction("c1");
            expect(result.success).toBe(true);
            expect(result.warning).toContain("files were retained");
            expect(m.revokeApprovedClaim).toHaveBeenCalledWith("c1", "admin-1");
            expect(m.storageList).not.toHaveBeenCalled();
            expect(m.storageRemove).not.toHaveBeenCalled();
        });

        it.each([
            ['REVOCATION_SOURCE_REVIEW_REQUIRED', 'source-retention review'],
            ['database unavailable', 'Could not confirm claim revocation'],
        ])("returns an actionable error on %s without touching storage", async (message, expected) => {
            const m = await setup();
            mockAdmin(m);
            m.getClaimById.mockResolvedValue({ id: 'c1', artistId: 'a1', status: 'approved' });
            m.revokeApprovedClaim.mockRejectedValue(new Error(message));
            const result = await m.revokeClaimAction('c1');
            expect(result.success).toBe(false);
            expect(result.error).toContain(expected);
            expect(m.storageList).not.toHaveBeenCalled();
            expect(m.storageRemove).not.toHaveBeenCalled();
        });

        it("rejects revoking a pending claim", async () => {
            const m = await setup();
            mockAdmin(m);
            m.getClaimById.mockResolvedValue({ id: "c1", artistId: "a1", status: "pending" });

            const result = await m.revokeClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Can only revoke approved claims");
            expect(m.revokeApprovedClaim).not.toHaveBeenCalled();
            expect(m.storageList).not.toHaveBeenCalled();
        });

        it("returns error when status changed between preflight and transaction", async () => {
            const m = await setup();
            mockAdmin(m);
            m.getClaimById.mockResolvedValue({ id: "c1", artistId: "a1", status: "approved", referenceCode: "MN-REVK" });
            m.revokeApprovedClaim.mockResolvedValue(undefined);

            const result = await m.revokeClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Claim is no longer approved");
            expect(m.storageList).not.toHaveBeenCalled();
        });

        it("rejects non-admin", async () => {
            const m = await setup();
            mockNonAdmin(m);

            const result = await m.revokeClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Not authorized");
        });

        it("returns error when claim not found", async () => {
            const m = await setup();
            mockAdmin(m);
            m.getClaimById.mockResolvedValue(undefined);

            const result = await m.revokeClaimAction("nonexistent");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Claim not found");
        });
    });

    describe("getAdminAllClaims", () => {
        it("returns claims for admin", async () => {
            const m = await setup();
            mockAdmin(m);
            m.getAllClaims.mockResolvedValue([{ id: "c1" }, { id: "c2" }]);

            const result = await m.getAdminAllClaims();
            expect(result).toHaveLength(2);
        });

        it("returns empty for non-admin", async () => {
            const m = await setup();
            mockNonAdmin(m);

            const result = await m.getAdminAllClaims();
            expect(result).toEqual([]);
        });
    });
});
