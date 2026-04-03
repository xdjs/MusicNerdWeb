// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/server/auth", () => ({
    getServerAuthSession: jest.fn(),
}));
jest.mock("@/server/utils/queries/dashboardQueries", () => ({
    getApprovedClaimByUserId: jest.fn(),
}));

if (!("json" in Response)) {
    Response.json = (data, init) =>
        new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
            status: init?.status || 200,
        });
}

describe("GET /api/user/has-claim", () => {
    beforeEach(() => {
        jest.resetModules();
    });

    async function setup() {
        const { getServerAuthSession } = await import("@/server/auth");
        const { getApprovedClaimByUserId } = await import("@/server/utils/queries/dashboardQueries");
        const { GET } = await import("../route");
        return {
            GET,
            getServerAuthSession: getServerAuthSession as jest.Mock,
            getApprovedClaimByUserId: getApprovedClaimByUserId as jest.Mock,
        };
    }

    it("returns hasClaim: false when unauthenticated", async () => {
        const { GET, getServerAuthSession } = await setup();
        getServerAuthSession.mockResolvedValue(null);

        const res = await GET();
        const data = await res.json();
        expect(data.hasClaim).toBe(false);
    });

    it("returns hasClaim: false when no approved claim", async () => {
        const { GET, getServerAuthSession, getApprovedClaimByUserId } = await setup();
        getServerAuthSession.mockResolvedValue({ user: { id: "u1" } });
        getApprovedClaimByUserId.mockResolvedValue(null);

        const res = await GET();
        const data = await res.json();
        expect(data.hasClaim).toBe(false);
    });

    it("returns hasClaim: true when approved claim exists", async () => {
        const { GET, getServerAuthSession, getApprovedClaimByUserId } = await setup();
        getServerAuthSession.mockResolvedValue({ user: { id: "u1" } });
        getApprovedClaimByUserId.mockResolvedValue({ id: "c1", artistId: "a1" });

        const res = await GET();
        const data = await res.json();
        expect(data.hasClaim).toBe(true);
    });
});
