/**
 * Service layer for cross-platform artist ID mappings.
 * Maps Spotify artist IDs to Deezer, Apple Music, MusicBrainz, etc.
 */
import { db } from "@/server/db/drizzle";
import { eq, sql } from "drizzle-orm";
import { artists, artistIdMappings } from "@/server/db/schema";

export const VALID_MAPPING_PLATFORMS = new Set([
  "deezer", "apple_music", "musicbrainz", "wikidata",
  "tidal", "amazon_music", "youtube_music",
]);

export const VALID_SOURCES = new Set([
  "wikidata", "musicbrainz", "name_search", "manual",
]);

const CONFIDENCE_PRIORITY: Record<string, number> = {
  manual: 4, high: 3, medium: 2, low: 1,
};

export async function getUnmappedArtists(
  platform: string,
  limit: number,
  offset: number,
): Promise<{ artists: { id: string; name: string | null; spotify: string | null }[]; totalUnmapped: number }> {
  if (!VALID_MAPPING_PLATFORMS.has(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const countResult = await db.execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total
    FROM artists a
    WHERE a.spotify IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM artist_id_mappings m
        WHERE m.artist_id = a.id AND m.platform = ${platform}
      )
  `);
  const totalUnmapped = countResult[0]?.total ?? 0;

  const result = await db.execute<{ id: string; name: string | null; spotify: string | null }>(sql`
    SELECT a.id, a.name, a.spotify
    FROM artists a
    WHERE a.spotify IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM artist_id_mappings m
        WHERE m.artist_id = a.id AND m.platform = ${platform}
      )
    ORDER BY a.name ASC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    artists: [...result],
    totalUnmapped,
  };
}

export async function resolveArtistMapping(params: {
  artistId: string;
  platform: string;
  platformId: string;
  confidence: string;
  source: string;
  reasoning?: string;
  apiKeyHash?: string;
}): Promise<{ created: boolean; updated: boolean; skipped: boolean; previousMapping?: { platformId: string; confidence: string } }> {
  const { artistId, platform, platformId, confidence, source, reasoning, apiKeyHash } = params;

  if (!VALID_MAPPING_PLATFORMS.has(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }
  if (!VALID_SOURCES.has(source)) {
    throw new Error(`Invalid source: ${source}`);
  }
  if (!CONFIDENCE_PRIORITY[confidence]) {
    throw new Error(`Invalid confidence level: ${confidence}`);
  }

  // Verify artist exists
  const artist = await db.query.artists.findFirst({
    where: eq(artists.id, artistId),
    columns: { id: true },
  });
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  // Check for existing mapping
  const existing = await db.query.artistIdMappings.findFirst({
    where: sql`${artistIdMappings.artistId} = ${artistId} AND ${artistIdMappings.platform} = ${platform}`,
  });

  if (existing) {
    const existingPriority = CONFIDENCE_PRIORITY[existing.confidence] ?? 0;
    const newPriority = CONFIDENCE_PRIORITY[confidence] ?? 0;

    if (newPriority < existingPriority) {
      return {
        created: false,
        updated: false,
        skipped: true,
        previousMapping: { platformId: existing.platformId, confidence: existing.confidence },
      };
    }

    // Update existing mapping
    await db.execute(sql`
      UPDATE artist_id_mappings
      SET platform_id = ${platformId},
          confidence = ${confidence}::confidence_level,
          source = ${source},
          reasoning = ${reasoning ?? null},
          api_key_hash = ${apiKeyHash ?? null},
          resolved_at = now(),
          updated_at = now()
      WHERE artist_id = ${artistId} AND platform = ${platform}
    `);

    return {
      created: false,
      updated: true,
      skipped: false,
      previousMapping: { platformId: existing.platformId, confidence: existing.confidence },
    };
  }

  // Insert new mapping
  await db.execute(sql`
    INSERT INTO artist_id_mappings (artist_id, platform, platform_id, confidence, source, reasoning, api_key_hash)
    VALUES (${artistId}, ${platform}, ${platformId}, ${confidence}::confidence_level, ${source}, ${reasoning ?? null}, ${apiKeyHash ?? null})
  `);

  return { created: true, updated: false, skipped: false };
}

export async function getMappingStats(): Promise<{
  totalArtistsWithSpotify: number;
  platformStats: { platform: string; mappedCount: number; percentage: number }[];
}> {
  const totalResult = await db.execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total FROM artists WHERE spotify IS NOT NULL
  `);
  const totalArtistsWithSpotify = totalResult[0]?.total ?? 0;

  const statsResult = await db.execute<{ platform: string; mapped_count: number }>(sql`
    SELECT platform, COUNT(*)::int AS mapped_count
    FROM artist_id_mappings
    GROUP BY platform
    ORDER BY mapped_count DESC
  `);

  const platformStats = [...statsResult].map(row => ({
    platform: row.platform,
    mappedCount: row.mapped_count,
    percentage: totalArtistsWithSpotify > 0
      ? Math.round((row.mapped_count / totalArtistsWithSpotify) * 10000) / 100
      : 0,
  }));

  return { totalArtistsWithSpotify, platformStats };
}

export async function getArtistMappings(artistId: string): Promise<{
  id: string;
  platform: string;
  platformId: string;
  confidence: string;
  source: string;
  reasoning: string | null;
  resolvedAt: string;
}[]> {
  const artist = await db.query.artists.findFirst({
    where: eq(artists.id, artistId),
    columns: { id: true },
  });
  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const result = await db.execute<{ id: string; platform: string; platform_id: string; confidence: string; source: string; reasoning: string | null; resolved_at: string }>(sql`
    SELECT id, platform, platform_id, confidence, source, reasoning, resolved_at
    FROM artist_id_mappings
    WHERE artist_id = ${artistId}
    ORDER BY platform ASC
  `);

  return [...result].map(row => ({
    id: row.id,
    platform: row.platform,
    platformId: row.platform_id,
    confidence: row.confidence,
    source: row.source,
    reasoning: row.reasoning,
    resolvedAt: row.resolved_at,
  }));
}
