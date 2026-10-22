/**
 * Service layer for cross-platform artist ID mappings.
 * Maps Spotify artist IDs to Deezer, Apple Music, MusicBrainz, etc.
 */
import { db } from "@/server/db/drizzle";
import { eq, sql, asc } from "drizzle-orm";
import { artists, artistIdMappings } from "@/server/db/schema";

export class MappingNotFoundError extends Error {
  constructor(message: string) { super(message); this.name = "MappingNotFoundError"; }
}

export class MappingValidationError extends Error {
  constructor(message: string) { super(message); this.name = "MappingValidationError"; }
}

export const VALID_MAPPING_PLATFORMS = new Set([
  "deezer", "apple_music", "musicbrainz", "wikidata",
  "tidal", "amazon_music", "youtube_music",
  "genius", "allmusic", "billboard", "rolling_stone",
]);

export async function getMappingStats(): Promise<{
  totalArtistsWithSpotify: number;
  totalArtistsWithDeezer: number;
  platformStats: { platform: string; mappedCount: number; percentage: number }[];
}> {
  const [totalResult, totalDeezerResult, statsResult] = await Promise.all([
    db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM artists WHERE spotify IS NOT NULL
    `),
    db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM artists WHERE deezer IS NOT NULL
    `),
    db.execute<{ platform: string; mapped_count: number }>(sql`
      SELECT platform, COUNT(*)::int AS mapped_count
      FROM artist_id_mappings
      GROUP BY platform
      ORDER BY mapped_count DESC
    `),
  ]);

  const totalArtistsWithSpotify = totalResult[0]?.total ?? 0;
  const totalArtistsWithDeezer = totalDeezerResult[0]?.total ?? 0;

  // Build a map of DB results, then ensure all valid platforms are represented
  const dbStats = new Map([...statsResult].map(row => [row.platform, row.mapped_count]));
  const platformStats = [...VALID_MAPPING_PLATFORMS].map(platform => {
    const mappedCount = dbStats.get(platform) ?? 0;
    return {
      platform,
      mappedCount,
      percentage: totalArtistsWithSpotify > 0
        ? Math.round((mappedCount / totalArtistsWithSpotify) * 10000) / 100
        : 0,
    };
  });

  return { totalArtistsWithSpotify, totalArtistsWithDeezer, platformStats };
}

export async function getArtistMappings(artistId: string) {
  // Single query — FK constraint means results imply artist exists.
  // Empty result could mean no mappings or unknown artist, so check the artist table only on empty.
  const mappings = await db.query.artistIdMappings.findMany({
    where: eq(artistIdMappings.artistId, artistId),
    orderBy: [asc(artistIdMappings.platform)],
    columns: {
      id: true,
      platform: true,
      platformId: true,
      confidence: true,
      source: true,
      reasoning: true,
      resolvedAt: true,
    },
  });

  if (mappings.length === 0) {
    const artist = await db.query.artists.findFirst({
      where: eq(artists.id, artistId),
      columns: { id: true },
    });
    if (!artist) {
      throw new MappingNotFoundError(`Artist not found: ${artistId}`);
    }
  }

  return mappings;
}

export async function getMappingExclusions(
  platform: string,
  limit: number = 100,
): Promise<{ exclusions: { id: string; artistId: string; artistName: string | null; spotify: string | null; platform: string; reason: string; details: string | null; createdAt: string }[]; total: number }> {
  if (!VALID_MAPPING_PLATFORMS.has(platform)) {
    throw new MappingValidationError(`Invalid platform: ${platform}`);
  }

  const effectiveLimit = Math.min(Math.max(limit, 1), 500);

  const [countResult, result] = await Promise.all([
    db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total
      FROM artist_mapping_exclusions
      WHERE platform = ${platform}
    `),
    db.execute<{ id: string; artist_id: string; artist_name: string | null; spotify: string | null; platform: string; reason: string; details: string | null; created_at: string }>(sql`
      SELECT e.id, e.artist_id, a.name AS artist_name, a.spotify, e.platform, e.reason, e.details, e.created_at
      FROM artist_mapping_exclusions e
      JOIN artists a ON a.id = e.artist_id
      WHERE e.platform = ${platform}
      ORDER BY e.created_at DESC
      LIMIT ${effectiveLimit}
    `),
  ]);

  return {
    exclusions: [...result].map(row => ({
      id: row.id,
      artistId: row.artist_id,
      artistName: row.artist_name,
      spotify: row.spotify,
      platform: row.platform,
      reason: row.reason,
      details: row.details,
      createdAt: row.created_at,
    })),
    total: countResult[0]?.total ?? 0,
  };
}
