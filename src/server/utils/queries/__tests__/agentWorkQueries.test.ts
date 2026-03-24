// @ts-nocheck
import { jest } from "@jest/globals";

// Mock dependencies
jest.mock("@/server/db/drizzle", () => ({
  db: { execute: jest.fn() },
}));
jest.mock("@/server/utils/idMappingService", () => ({
  getMappingStats: jest.fn(),
  getMappingExclusions: jest.fn(),
  VALID_MAPPING_PLATFORMS: new Set(["deezer", "apple_music", "musicbrainz", "wikidata", "tidal", "amazon_music", "youtube_music"]),
}));

describe("agentWorkQueries", () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    const { getMappingStats, getMappingExclusions } = await import("@/server/utils/idMappingService");
    const {
      getAuditLog, getAgentBreakdown, getExclusionsByPlatform, getAgentWorkData,
      getActivityPulse, getHourlyActivity, getTodayCounts,
    } = await import("../agentWorkQueries");
    return {
      db, getMappingStats, getMappingExclusions,
      getAuditLog, getAgentBreakdown, getExclusionsByPlatform, getAgentWorkData,
      getActivityPulse, getHourlyActivity, getTodayCounts,
    };
  }

  describe("getAuditLog", () => {
    it("returns paginated results with correct LIMIT/OFFSET", async () => {
      const { db, getAuditLog } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([{ total: 120 }])
        .mockResolvedValueOnce([
          { id: "a1", artist_id: "art1", artist_name: "Test Artist", field: "mapping:deezer", action: "resolve", old_value: null, new_value: "123", agent_label: "agent-1", created_at: "2026-03-16T00:00:00Z" },
        ]);

      const result = await getAuditLog(2, 25);
      expect(result.total).toBe(120);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].artistName).toBe("Test Artist");
      expect(result.entries[0].action).toBe("resolve");
    });

    it("returns total count from separate query", async () => {
      const { db, getAuditLog } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([{ total: 500 }])
        .mockResolvedValueOnce([]);

      const result = await getAuditLog(1, 50);
      expect(result.total).toBe(500);
      expect(result.entries).toHaveLength(0);
    });

    it("clamps page and limit to safe values", async () => {
      const { db, getAuditLog } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([{ total: 0 }])
        .mockResolvedValueOnce([]);

      const result = await getAuditLog(-1, 999);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(200);
    });
  });

  describe("getAgentBreakdown", () => {
    it("merges mappings and exclusions by api_key_hash", async () => {
      const { db, getAgentBreakdown } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([
          { api_key_hash: "hash1", agent_label: "agent-1", total: 50, high: 40, medium: 8, low: 2, manual: 0, src_wikidata: 10, src_musicbrainz: 15, src_name_search: 20, src_web_search: 5, src_manual: 0 },
        ])
        .mockResolvedValueOnce([
          { api_key_hash: "hash1", agent_label: "agent-1", total: 5 },
        ])
        .mockResolvedValueOnce([
          { api_key_hash: "hash1", last_active_at: "2026-03-16T12:00:00Z" },
        ]);

      const result = await getAgentBreakdown();
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].resolvedCount).toBe(50);
      expect(result.agents[0].excludedCount).toBe(5);
      expect(result.agents[0].byConfidence.high).toBe(40);
      expect(result.agents[0].bySource.wikidata).toBe(10);
      expect(result.agents[0].lastActiveAt).toBe("2026-03-16T12:00:00Z");
    });

    it("handles agent with mappings but no exclusions", async () => {
      const { db, getAgentBreakdown } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([
          { api_key_hash: "hash1", agent_label: "agent-1", total: 30, high: 30, medium: 0, low: 0, manual: 0, src_wikidata: 30, src_musicbrainz: 0, src_name_search: 0, src_web_search: 0, src_manual: 0 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { api_key_hash: "hash1", last_active_at: "2026-03-16T12:00:00Z" },
        ]);

      const result = await getAgentBreakdown();
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].excludedCount).toBe(0);
    });

    it("handles agent with only exclusions", async () => {
      const { db, getAgentBreakdown } = await setup();
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { api_key_hash: "hash2", agent_label: "agent-2", total: 10 },
        ])
        .mockResolvedValueOnce([
          { api_key_hash: "hash2", last_active_at: "2026-03-16T11:00:00Z" },
        ]);

      const result = await getAgentBreakdown();
      expect(result.agents).toHaveLength(1);
      expect(result.agents[0].resolvedCount).toBe(0);
      expect(result.agents[0].excludedCount).toBe(10);
      expect(result.agents[0].lastActiveAt).toBe("2026-03-16T11:00:00Z");
    });
  });

  describe("getExclusionsByPlatform", () => {
    it("skips platforms with no exclusions", async () => {
      const { db, getMappingExclusions, getExclusionsByPlatform } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { platform: "deezer", total: 5 },
      ]);
      (getMappingExclusions as jest.Mock).mockResolvedValueOnce({
        exclusions: [{ id: "e1", artistId: "a1", artistName: "X", spotify: "sp1", reason: "conflict", details: null, createdAt: "2026-01-01" }],
        total: 5,
      });

      const result = await getExclusionsByPlatform();
      expect(Object.keys(result.platforms)).toEqual(["deezer"]);
      expect(getMappingExclusions).toHaveBeenCalledTimes(1);
      expect(getMappingExclusions).toHaveBeenCalledWith("deezer", 500);
    });

    it("returns empty object when no exclusions exist", async () => {
      const { db, getMappingExclusions, getExclusionsByPlatform } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([]);

      const result = await getExclusionsByPlatform();
      expect(result.platforms).toEqual({});
      expect(getMappingExclusions).not.toHaveBeenCalled();
    });
  });

  describe("getActivityPulse", () => {
    it("returns last write time and hourly rate", async () => {
      const { db, getActivityPulse } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { last_write_at: "2026-03-16T15:30:00Z", rate_last_hour: 42 },
      ]);

      const result = await getActivityPulse();
      expect(result.lastWriteAt).toBe("2026-03-16T15:30:00Z");
      expect(result.rateLastHour).toBe(42);
    });

    it("returns nulls/zeros when no audit entries exist", async () => {
      const { db, getActivityPulse } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { last_write_at: null, rate_last_hour: 0 },
      ]);

      const result = await getActivityPulse();
      expect(result.lastWriteAt).toBeNull();
      expect(result.rateLastHour).toBe(0);
    });
  });

  describe("getHourlyActivity", () => {
    it("returns hourly buckets with resolve and exclude counts", async () => {
      const { db, getHourlyActivity } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { hour: "2026-03-16T14:00:00Z", resolve_count: 20, exclude_count: 3 },
        { hour: "2026-03-16T15:00:00Z", resolve_count: 35, exclude_count: 1 },
      ]);

      const result = await getHourlyActivity();
      expect(result).toHaveLength(2);
      expect(result[0].hour).toBe("2026-03-16T14:00:00Z");
      expect(result[0].resolveCount).toBe(20);
      expect(result[0].excludeCount).toBe(3);
      expect(result[1].resolveCount).toBe(35);
    });
  });

  describe("getTodayCounts", () => {
    it("returns a map of platform to today count", async () => {
      const { db, getTodayCounts } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([
        { platform: "deezer", today: 15 },
        { platform: "tidal", today: 8 },
      ]);

      const result = await getTodayCounts();
      expect(result).toEqual({ deezer: 15, tidal: 8 });
    });

    it("returns empty map when no mappings today", async () => {
      const { db, getTodayCounts } = await setup();
      (db.execute as jest.Mock).mockResolvedValueOnce([]);

      const result = await getTodayCounts();
      expect(result).toEqual({});
    });
  });

  describe("getAgentWorkData", () => {
    it("orchestrates all queries and returns combined shape", async () => {
      const { db, getMappingStats, getMappingExclusions, getAgentWorkData } = await setup();
      (getMappingStats as jest.Mock).mockResolvedValueOnce({
        totalArtistsWithSpotify: 1000,
        platformStats: [{ platform: "deezer", mappedCount: 50, percentage: 5 }],
      });
      // getAuditLog: count + rows
      (db.execute as jest.Mock)
        .mockResolvedValueOnce([{ total: 10 }])
        .mockResolvedValueOnce([])
        // getAgentBreakdown: mappings + exclusions + lastActive
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        // getExclusionsByPlatform: counts
        .mockResolvedValueOnce([])
        // getActivityPulse
        .mockResolvedValueOnce([{ last_write_at: "2026-03-16T15:00:00Z", rate_last_hour: 10 }])
        // getHourlyActivity
        .mockResolvedValueOnce([])
        // getTodayCounts
        .mockResolvedValueOnce([{ platform: "deezer", today: 5 }])
        // getActiveWorkers
        .mockResolvedValueOnce([]);

      const result = await getAgentWorkData(1, 50);
      expect(result.stats.totalArtistsWithSpotify).toBe(1000);
      expect(result.stats.platformStats[0].todayCount).toBe(5);
      expect(result.auditLog.total).toBe(10);
      expect(result.agentBreakdown.agents).toHaveLength(0);
      expect(result.exclusions.platforms).toEqual({});
      expect(result.activityPulse.lastWriteAt).toBe("2026-03-16T15:00:00Z");
      expect(result.activityPulse.rateLastHour).toBe(10);
      expect(result.hourlyActivity).toEqual([]);
      expect(result.workers).toEqual([]);
    });
  });
});
