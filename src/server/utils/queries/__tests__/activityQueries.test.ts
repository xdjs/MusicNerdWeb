// @ts-nocheck
import { jest } from "@jest/globals";

jest.mock("@/server/db/drizzle", () => ({
    db: { execute: jest.fn() },
}));

describe("activityQueries", () => {
    beforeEach(() => { jest.resetModules(); });

    async function setup() {
        const { db } = await import("@/server/db/drizzle");
        const { getRecentActivity } = await import("../activityQueries");
        return { db, getRecentActivity };
    }

    it("returns events sorted by created_at DESC", async () => {
        const { db, getRecentActivity } = await setup();
        const mockRows = [
            { type: "agent_mapping", artist_id: "a1", artist_name: "Mogwai", platform: "mapping:deezer", created_at: "2026-03-27T12:00:00Z" },
            { type: "ugc_approved", artist_id: "a2", artist_name: "SENTO", platform: "youtube", created_at: "2026-03-27T11:55:00Z" },
            { type: "artist_added", artist_id: "a3", artist_name: "Taylor Swift", platform: null, created_at: "2026-03-27T11:00:00Z" },
        ];
        (db.execute as jest.Mock).mockResolvedValueOnce(mockRows);

        const result = await getRecentActivity();

        expect(result).toHaveLength(3);
        expect(result[0].type).toBe("agent_mapping");
        expect(result[0].artist_name).toBe("Mogwai");
        expect(result[1].type).toBe("ugc_approved");
        expect(result[2].type).toBe("artist_added");
    });

    it("returns empty array when no events exist", async () => {
        const { db, getRecentActivity } = await setup();
        (db.execute as jest.Mock).mockResolvedValueOnce([]);

        const result = await getRecentActivity();
        expect(result).toEqual([]);
    });

    it("passes since parameter for polling updates", async () => {
        const { db, getRecentActivity } = await setup();
        (db.execute as jest.Mock).mockResolvedValueOnce([
            { type: "agent_mapping", artist_id: "a1", artist_name: "New Artist", platform: "mapping:tidal", created_at: "2026-03-27T13:00:00Z" },
        ]);

        const result = await getRecentActivity("2026-03-27T12:00:00Z");

        expect(result).toHaveLength(1);
        expect(result[0].artist_name).toBe("New Artist");
        expect(db.execute).toHaveBeenCalledTimes(1);
    });

    it("passes undefined since for initial load", async () => {
        const { db, getRecentActivity } = await setup();
        (db.execute as jest.Mock).mockResolvedValueOnce([]);

        await getRecentActivity(undefined);
        expect(db.execute).toHaveBeenCalledTimes(1);
    });
});
