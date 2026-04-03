// @ts-nocheck
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
}));
jest.mock("@/server/utils/queries/vaultWebSearch", () => ({
    searchAndPopulateVault: jest.fn().mockResolvedValue(0),
}));
jest.mock("@/server/utils/queries/discord", () => ({
    sendDiscordMessage: jest.fn().mockResolvedValue(undefined),
}));

describe("adminClaimActions", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    async function setup() {
        const { getServerAuthSession } = await import("@/server/auth");
        const { getUserById } = await import("@/server/utils/queries/userQueries");
        const { approveClaim, rejectClaim, deleteClaim, getAllClaims } = await import("@/server/utils/queries/dashboardQueries");
        const { approveClaimAction, rejectClaimAction, revokeClaimAction, getAdminAllClaims } = await import("../adminClaimActions");

        return {
            getServerAuthSession: getServerAuthSession as jest.Mock,
            getUserById: getUserById as jest.Mock,
            approveClaim: approveClaim as jest.Mock,
            rejectClaim: rejectClaim as jest.Mock,
            deleteClaim: deleteClaim as jest.Mock,
            getAllClaims: getAllClaims as jest.Mock,
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
        it("approves a claim when admin", async () => {
            const m = await setup();
            mockAdmin(m);
            m.approveClaim.mockResolvedValue({ id: "c1", artistId: "a1", referenceCode: "MN-TEST" });

            const result = await m.approveClaimAction("c1");
            expect(result.success).toBe(true);
            expect(m.approveClaim).toHaveBeenCalledWith("c1");
        });

        it("rejects non-admin", async () => {
            const m = await setup();
            mockNonAdmin(m);

            const result = await m.approveClaimAction("c1");
            expect(result.success).toBe(false);
            expect(result.error).toBe("Not authorized");
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
        it("hard-deletes a claim when admin", async () => {
            const m = await setup();
            mockAdmin(m);
            m.deleteClaim.mockResolvedValue({ id: "c1", artistId: "a1", referenceCode: "MN-REVK" });

            const result = await m.revokeClaimAction("c1");
            expect(result.success).toBe(true);
            expect(m.deleteClaim).toHaveBeenCalledWith("c1");
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
            m.deleteClaim.mockResolvedValue(undefined);

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
