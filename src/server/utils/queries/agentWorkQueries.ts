/**
 * Queries for the Agent Work admin tab.
 * Surfaces mapping stats, audit log, per-agent breakdown, and exclusions.
 */
import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";
import { getMappingStats, getMappingExclusions, VALID_MAPPING_PLATFORMS } from "@/server/utils/idMappingService";

// --- Types ---

export interface AuditLogEntry {
  id: string;
  artistId: string;
  artistName: string | null;
  field: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  agentLabel: string | null;
  createdAt: string;
}

export interface AgentBreakdownRow {
  label: string | null;
  apiKeyHash: string;
  resolvedCount: number;
  excludedCount: number;
  byConfidence: { high: number; medium: number; low: number; manual: number };
  bySource: { wikidata: number; musicbrainz: number; name_search: number; web_search: number; manual: number };
}

export interface AgentWorkData {
  stats: Awaited<ReturnType<typeof getMappingStats>>;
  auditLog: {
    entries: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  };
  agentBreakdown: { agents: AgentBreakdownRow[] };
  exclusions: {
    platforms: Record<string, {
      exclusions: { id: string; artistId: string; artistName: string | null; spotify: string | null; reason: string; details: string | null; createdAt: string }[];
      total: number;
    }>;
  };
}

// --- Queries ---

export async function getAuditLog(page: number = 1, limit: number = 50): Promise<{
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}> {
  const effectivePage = Math.max(page, 1);
  const effectiveLimit = Math.min(Math.max(limit, 1), 200);
  const offset = (effectivePage - 1) * effectiveLimit;

  const [countResult, rows] = await Promise.all([
    db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::int AS total FROM mcp_audit_log
    `),
    db.execute<{
      id: string; artist_id: string; artist_name: string | null;
      field: string; action: string;
      old_value: string | null; new_value: string | null;
      agent_label: string | null; created_at: string;
    }>(sql`
      SELECT
        al.id, al.artist_id, a.name AS artist_name,
        al.field, al.action,
        al.old_value, al.new_value,
        k.label AS agent_label, al.created_at
      FROM mcp_audit_log al
      JOIN artists a ON a.id = al.artist_id
      LEFT JOIN mcp_api_keys k ON k.key_hash = al.api_key_hash
      ORDER BY al.created_at DESC
      LIMIT ${effectiveLimit} OFFSET ${offset}
    `),
  ]);

  return {
    entries: [...rows].map(row => ({
      id: row.id,
      artistId: row.artist_id,
      artistName: row.artist_name,
      field: row.field,
      action: row.action,
      oldValue: row.old_value,
      newValue: row.new_value,
      agentLabel: row.agent_label,
      createdAt: row.created_at,
    })),
    total: countResult[0]?.total ?? 0,
    page: effectivePage,
    limit: effectiveLimit,
  };
}

export async function getAgentBreakdown(): Promise<{ agents: AgentBreakdownRow[] }> {
  const [mappingRows, exclusionRows] = await Promise.all([
    db.execute<{
      api_key_hash: string; agent_label: string | null;
      total: number;
      high: number; medium: number; low: number; manual: number;
      src_wikidata: number; src_musicbrainz: number; src_name_search: number; src_web_search: number; src_manual: number;
    }>(sql`
      SELECT
        m.api_key_hash,
        k.label AS agent_label,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE m.confidence = 'high')::int AS high,
        COUNT(*) FILTER (WHERE m.confidence = 'medium')::int AS medium,
        COUNT(*) FILTER (WHERE m.confidence = 'low')::int AS low,
        COUNT(*) FILTER (WHERE m.confidence = 'manual')::int AS manual,
        COUNT(*) FILTER (WHERE m.source = 'wikidata')::int AS src_wikidata,
        COUNT(*) FILTER (WHERE m.source = 'musicbrainz')::int AS src_musicbrainz,
        COUNT(*) FILTER (WHERE m.source = 'name_search')::int AS src_name_search,
        COUNT(*) FILTER (WHERE m.source = 'web_search')::int AS src_web_search,
        COUNT(*) FILTER (WHERE m.source = 'manual')::int AS src_manual
      FROM artist_id_mappings m
      LEFT JOIN mcp_api_keys k ON k.key_hash = m.api_key_hash
      WHERE m.api_key_hash IS NOT NULL
      GROUP BY m.api_key_hash, k.label
      ORDER BY total DESC
    `),
    db.execute<{ api_key_hash: string; agent_label: string | null; total: number }>(sql`
      SELECT
        e.api_key_hash,
        k.label AS agent_label,
        COUNT(*)::int AS total
      FROM artist_mapping_exclusions e
      LEFT JOIN mcp_api_keys k ON k.key_hash = e.api_key_hash
      WHERE e.api_key_hash IS NOT NULL
      GROUP BY e.api_key_hash, k.label
    `),
  ]);

  // Merge mappings and exclusions by api_key_hash
  const agentMap = new Map<string, AgentBreakdownRow>();

  for (const row of mappingRows) {
    agentMap.set(row.api_key_hash, {
      label: row.agent_label,
      apiKeyHash: row.api_key_hash,
      resolvedCount: row.total,
      excludedCount: 0,
      byConfidence: { high: row.high, medium: row.medium, low: row.low, manual: row.manual },
      bySource: { wikidata: row.src_wikidata, musicbrainz: row.src_musicbrainz, name_search: row.src_name_search, web_search: row.src_web_search, manual: row.src_manual },
    });
  }

  for (const row of exclusionRows) {
    const existing = agentMap.get(row.api_key_hash);
    if (existing) {
      existing.excludedCount = row.total;
    } else {
      agentMap.set(row.api_key_hash, {
        label: row.agent_label,
        apiKeyHash: row.api_key_hash,
        resolvedCount: 0,
        excludedCount: row.total,
        byConfidence: { high: 0, medium: 0, low: 0, manual: 0 },
        bySource: { wikidata: 0, musicbrainz: 0, name_search: 0, web_search: 0, manual: 0 },
      });
    }
  }

  return { agents: [...agentMap.values()] };
}

export async function getExclusionsByPlatform(): Promise<AgentWorkData["exclusions"]> {
  // First, get counts per platform to skip empty ones
  const countRows = await db.execute<{ platform: string; total: number }>(sql`
    SELECT platform, COUNT(*)::int AS total
    FROM artist_mapping_exclusions
    GROUP BY platform
  `);

  const platformsWithData = [...countRows].filter(row =>
    row.total > 0 && VALID_MAPPING_PLATFORMS.has(row.platform)
  );

  if (platformsWithData.length === 0) {
    return { platforms: {} };
  }

  // Fetch details only for platforms with exclusions
  const results = await Promise.all(
    platformsWithData.map(({ platform }) => getMappingExclusions(platform, 500))
  );

  const platforms: AgentWorkData["exclusions"]["platforms"] = {};
  platformsWithData.forEach(({ platform }, i) => {
    platforms[platform] = results[i];
  });

  return { platforms };
}

export async function getAgentWorkData(
  auditPage: number = 1,
  auditLimit: number = 50,
): Promise<AgentWorkData> {
  const [stats, auditLog, agentBreakdown, exclusions] = await Promise.all([
    getMappingStats(),
    getAuditLog(auditPage, auditLimit),
    getAgentBreakdown(),
    getExclusionsByPlatform(),
  ]);

  return { stats, auditLog, agentBreakdown, exclusions };
}
