// @ts-nocheck
import { jest } from "@jest/globals";

describe("idMappingService", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  async function setup() {
    const { db } = await import("@/server/db/drizzle");
    db.execute = jest.fn().mockResolvedValue([]);
    (db as any).query.artists = {
      findFirst: jest.fn().mockResolvedValue({ id: "artist-123" }),
      findMany: jest.fn(),
    };
    (db as any).query.artistIdMappings = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    };

    const { getMappingStats, getArtistMappings, getMappingExclusions } = await import("../idMappingService");

    return { db, getMappingStats, getArtistMappings, getMappingExclusions };
  }

  // getMappingStats
  it("returns stats for all platforms including unmapped ones", async () => {
    const { db, getMappingStats } = await setup();
    (db as any).execute = jest.fn()
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([{ total: 390 }])
      .mockResolvedValueOnce([{ platform: "deezer", mapped_count: 50 }]);

    const stats = await getMappingStats();
    expect(stats.totalArtistsWithSpotify).toBe(100);
    expect(stats.totalArtistsWithDeezer).toBe(390);
    // All valid platforms should be present
    expect(stats.platformStats).toHaveLength(11);
    const deezer = stats.platformStats.find(s => s.platform === "deezer");
    expect(deezer.mappedCount).toBe(50);
    expect(deezer.percentage).toBe(50);
    // Unmapped platforms should show 0
    const tidal = stats.platformStats.find(s => s.platform === "tidal");
    expect(tidal.mappedCount).toBe(0);
    expect(tidal.percentage).toBe(0);
  });

  // getArtistMappings
  it("returns mappings without artist existence check on happy path", async () => {
    const { db, getArtistMappings } = await setup();
    (db as any).query.artistIdMappings.findMany.mockResolvedValue([
      { id: "m1", platform: "deezer", platformId: "456", confidence: "high", source: "wikidata", reasoning: null, resolvedAt: "2026-01-01" },
    ]);

    const mappings = await getArtistMappings("artist-123");
    expect(mappings).toHaveLength(1);
    expect(mappings[0].platform).toBe("deezer");
    expect(mappings[0].platformId).toBe("456");
    // Should not have checked artist existence since mappings were found
    expect((db as any).query.artists.findFirst).not.toHaveBeenCalled();
  });

  it("throws for non-existent artist when no mappings found", async () => {
    const { db, getArtistMappings } = await setup();
    (db as any).query.artistIdMappings.findMany.mockResolvedValue([]);
    (db as any).query.artists.findFirst.mockResolvedValue(null);
    await expect(getArtistMappings("nonexistent")).rejects.toThrow("Artist not found");
  });

  it("returns empty array for valid artist with no mappings", async () => {
    const { db, getArtistMappings } = await setup();
    (db as any).query.artistIdMappings.findMany.mockResolvedValue([]);
    // Artist exists but has no mappings
    (db as any).query.artists.findFirst.mockResolvedValue({ id: "artist-123" });
    const mappings = await getArtistMappings("artist-123");
    expect(mappings).toEqual([]);
  });


  // getMappingExclusions
  it("returns exclusions with artist info", async () => {
    const { db, getMappingExclusions } = await setup();
    db.execute = jest.fn()
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{
        id: "excl-1", artist_id: "a1", artist_name: "Artist 1", spotify: "sp1",
        platform: "deezer", reason: "name_mismatch", details: "name mismatch details",
        created_at: "2026-01-01T00:00:00Z",
      }]);

    const result = await getMappingExclusions("deezer");
    expect(result.total).toBe(1);
    expect(result.exclusions).toHaveLength(1);
    expect(result.exclusions[0].artistName).toBe("Artist 1");
    expect(result.exclusions[0].reason).toBe("name_mismatch");
  });

  it("rejects invalid platform for getMappingExclusions", async () => {
    const { getMappingExclusions } = await setup();
    await expect(getMappingExclusions("invalid")).rejects.toThrow("Invalid platform: invalid");
  });
});
