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

    const {
      getUnmappedArtists,
      resolveArtistMapping,
      getMappingStats,
      getArtistMappings,
      VALID_MAPPING_PLATFORMS,
      VALID_SOURCES,
    } = await import("../idMappingService");

    return {
      db,
      getUnmappedArtists,
      resolveArtistMapping,
      getMappingStats,
      getArtistMappings,
      VALID_MAPPING_PLATFORMS,
      VALID_SOURCES,
    };
  }

  // resolveArtistMapping validation
  it("rejects invalid platform", async () => {
    const { resolveArtistMapping } = await setup();
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "badplatform", platformId: "123", confidence: "high", source: "manual" })
    ).rejects.toThrow("Invalid platform: badplatform");
  });

  it("rejects invalid source", async () => {
    const { resolveArtistMapping } = await setup();
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "deezer", platformId: "123", confidence: "high", source: "badsource" })
    ).rejects.toThrow("Invalid source: badsource");
  });

  it("rejects invalid confidence level", async () => {
    const { resolveArtistMapping } = await setup();
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "deezer", platformId: "123", confidence: "invalid", source: "manual" })
    ).rejects.toThrow("Invalid confidence level: invalid");
  });

  it("rejects empty platformId", async () => {
    const { resolveArtistMapping } = await setup();
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "deezer", platformId: "", confidence: "high", source: "manual" })
    ).rejects.toThrow("platformId cannot be empty");
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "deezer", platformId: "   ", confidence: "high", source: "manual" })
    ).rejects.toThrow("platformId cannot be empty");
  });

  it("throws for non-existent artist", async () => {
    const { db, resolveArtistMapping } = await setup();
    (db as any).query.artists.findFirst.mockResolvedValue(null);
    await expect(
      resolveArtistMapping({ artistId: "nonexistent", platform: "deezer", platformId: "123", confidence: "high", source: "manual" })
    ).rejects.toThrow("Artist not found");
  });

  it("throws conflict when platformId is already mapped to a different artist", async () => {
    const { db, resolveArtistMapping } = await setup();
    // No existing mapping for this artist+platform
    (db as any).query.artistIdMappings.findFirst
      .mockResolvedValueOnce(null) // artist+platform check
      .mockResolvedValueOnce({ artistId: "other-artist", platform: "deezer", platformId: "456" }); // conflict check
    await expect(
      resolveArtistMapping({ artistId: "artist-123", platform: "deezer", platformId: "456", confidence: "high", source: "manual" })
    ).rejects.toThrow("Conflict: platformId 456 on deezer is already mapped to artist other-artist");
  });

  it("allows same platformId when mapped to the same artist", async () => {
    const { db, resolveArtistMapping } = await setup();
    // Existing mapping for this artist+platform
    (db as any).query.artistIdMappings.findFirst
      .mockResolvedValueOnce({ artistId: "artist-123", platform: "deezer", platformId: "456", confidence: "low" }) // artist+platform check
      .mockResolvedValueOnce({ artistId: "artist-123", platform: "deezer", platformId: "456" }); // conflict check — same artist, no conflict
    const result = await resolveArtistMapping({
      artistId: "artist-123", platform: "deezer", platformId: "456", confidence: "high", source: "manual",
    });
    expect(result.updated).toBe(true);
  });

  it("creates new mapping", async () => {
    const { db, resolveArtistMapping } = await setup();
    const result = await resolveArtistMapping({
      artistId: "artist-123", platform: "deezer", platformId: "456",
      confidence: "high", source: "wikidata", reasoning: "matched via ISNI",
    });
    expect(result.created).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.skipped).toBe(false);
    expect(db.execute).toHaveBeenCalled();
  });

  it("updates existing mapping with equal confidence", async () => {
    const { db, resolveArtistMapping } = await setup();
    (db as any).query.artistIdMappings.findFirst
      .mockResolvedValueOnce({ artistId: "artist-123", platformId: "old-id", confidence: "medium" })
      .mockResolvedValueOnce(null); // no conflict
    const result = await resolveArtistMapping({
      artistId: "artist-123", platform: "deezer", platformId: "new-id",
      confidence: "medium", source: "musicbrainz",
    });
    expect(result.updated).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.previousMapping).toEqual({ platformId: "old-id", confidence: "medium" });
  });

  it("updates existing mapping with higher confidence", async () => {
    const { db, resolveArtistMapping } = await setup();
    (db as any).query.artistIdMappings.findFirst
      .mockResolvedValueOnce({ artistId: "artist-123", platformId: "old-id", confidence: "low" })
      .mockResolvedValueOnce(null); // no conflict
    const result = await resolveArtistMapping({
      artistId: "artist-123", platform: "deezer", platformId: "new-id",
      confidence: "high", source: "wikidata",
    });
    expect(result.updated).toBe(true);
    expect(result.skipped).toBe(false);
  });

  it("skips update when existing has higher confidence", async () => {
    const { db, resolveArtistMapping } = await setup();
    (db as any).query.artistIdMappings.findFirst
      .mockResolvedValueOnce({ artistId: "artist-123", platformId: "existing-id", confidence: "manual" })
      .mockResolvedValueOnce(null); // no conflict
    const result = await resolveArtistMapping({
      artistId: "artist-123", platform: "deezer", platformId: "new-id",
      confidence: "high", source: "wikidata",
    });
    expect(result.skipped).toBe(true);
    expect(result.created).toBe(false);
    expect(result.updated).toBe(false);
    expect(result.previousMapping).toEqual({ platformId: "existing-id", confidence: "manual" });
  });

  // getUnmappedArtists
  it("returns unmapped artists for valid platform", async () => {
    const { db, getUnmappedArtists } = await setup();
    (db as any).execute = jest.fn()
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([{ id: "a1", name: "Artist 1", spotify: "sp1" }]);

    const result = await getUnmappedArtists("deezer", 10, 0);
    expect(result.totalUnmapped).toBe(2);
    expect(result.artists).toHaveLength(1);
    expect(result.artists[0].id).toBe("a1");
  });

  it("rejects invalid platform for getUnmappedArtists", async () => {
    const { getUnmappedArtists } = await setup();
    await expect(getUnmappedArtists("invalid", 10, 0)).rejects.toThrow("Invalid platform: invalid");
  });

  // getMappingStats
  it("returns stats structure", async () => {
    const { db, getMappingStats } = await setup();
    (db as any).execute = jest.fn()
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([{ platform: "deezer", mapped_count: 50 }]);

    const stats = await getMappingStats();
    expect(stats.totalArtistsWithSpotify).toBe(100);
    expect(stats.platformStats).toHaveLength(1);
    expect(stats.platformStats[0].platform).toBe("deezer");
    expect(stats.platformStats[0].mappedCount).toBe(50);
    expect(stats.platformStats[0].percentage).toBe(50);
  });

  // getArtistMappings
  it("returns mappings for valid artist", async () => {
    const { db, getArtistMappings } = await setup();
    (db as any).execute = jest.fn().mockResolvedValue([
      { id: "m1", platform: "deezer", platform_id: "456", confidence: "high", source: "wikidata", reasoning: null, resolved_at: "2026-01-01" },
    ]);

    const mappings = await getArtistMappings("artist-123");
    expect(mappings).toHaveLength(1);
    expect(mappings[0].platform).toBe("deezer");
    expect(mappings[0].platformId).toBe("456");
  });

  it("throws for non-existent artist in getArtistMappings", async () => {
    const { db, getArtistMappings } = await setup();
    (db as any).query.artists.findFirst.mockResolvedValue(null);
    await expect(getArtistMappings("nonexistent")).rejects.toThrow("Artist not found");
  });
});
