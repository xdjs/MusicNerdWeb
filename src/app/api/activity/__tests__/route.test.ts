// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/server/utils/queries/activityQueries", () => ({
    getRecentActivity: jest.fn(),
}));

// Polyfill Response.json (JSDOM)
if (!("json" in Response)) {
    Response.json = (data, init) =>
        new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
            status: init?.status || 200,
        });
}

describe("GET /api/activity", () => {
    beforeEach(() => { jest.resetModules(); });

    async function setup() {
        const { getRecentActivity } = await import("@/server/utils/queries/activityQueries");
        const { GET } = await import("../route");
        return { GET, getRecentActivity: getRecentActivity as jest.Mock };
    }

    it("returns 200 with events on initial load (no since param)", async () => {
        const { GET, getRecentActivity } = await setup();
        getRecentActivity.mockResolvedValueOnce([
            { type: "agent_mapping", artist_id: "a1", artist_name: "Mogwai", platform: "mapping:deezer", created_at: "2026-03-27T12:00:00Z" },
            { type: "artist_added", artist_id: "a2", artist_name: "Taylor Swift", platform: null, created_at: "2026-03-27T11:00:00Z" },
        ]);

        const request = new Request("http://localhost/api/activity");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(2);
        expect(data[0].artistName).toBe("Mogwai");
        expect(data[0].platform).toBe("deezer");
        expect(data[1].artistName).toBe("Taylor Swift");
        expect(data[1].platform).toBeNull();
        expect(getRecentActivity).toHaveBeenCalledWith(undefined);
    });

    it("strips mapping: prefix from platform field", async () => {
        const { GET, getRecentActivity } = await setup();
        getRecentActivity.mockResolvedValueOnce([
            { type: "agent_mapping", artist_id: "a1", artist_name: "Mogwai", platform: "mapping:apple_music", created_at: "2026-03-27T12:00:00Z" },
        ]);

        const request = new Request("http://localhost/api/activity");
        const response = await GET(request);
        const data = await response.json();

        expect(data[0].platform).toBe("apple_music");
    });

    it("passes since param to query when provided", async () => {
        const { GET, getRecentActivity } = await setup();
        getRecentActivity.mockResolvedValueOnce([]);

        const request = new Request("http://localhost/api/activity?since=2026-03-27T12:00:00Z");
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(getRecentActivity).toHaveBeenCalledWith("2026-03-27T12:00:00Z");
    });

    it("returns 200 with empty array when no events", async () => {
        const { GET, getRecentActivity } = await setup();
        getRecentActivity.mockResolvedValueOnce([]);

        const request = new Request("http://localhost/api/activity");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual([]);
    });

    it("returns 500 on query failure", async () => {
        const { GET, getRecentActivity } = await setup();
        getRecentActivity.mockRejectedValueOnce(new Error("DB connection failed"));

        const request = new Request("http://localhost/api/activity");
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Failed to fetch activity");
    });
});
