import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

export interface AgentRun {
  workerId: string;
  runNumber: number;
  platform: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  wallTimeSecs: number | null;
  claudeTimeSecs: number | null;
  apiTimeSecs: number | null;
  turns: number | null;
  batchSize: number | null;
  resolved: number;
  excluded: number;
  skipped: number;
  errors: number;
  highConfidence: number;
  mediumConfidence: number;
  conflicts: number;
  nameMismatches: number;
  tooAmbiguous: number;
  exitCode: number | null;
  failCategory: string | null;
  failReason: string | null;
}

export async function upsertRun(params: {
  workerId: string;
  apiKeyHash: string;
  runNumber: number;
  platform?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  wallTimeSecs?: number;
  claudeTimeSecs?: number;
  apiTimeSecs?: number;
  turns?: number;
  batchSize?: number;
  resolved?: number;
  excluded?: number;
  skipped?: number;
  errors?: number;
  highConfidence?: number;
  mediumConfidence?: number;
  conflicts?: number;
  nameMismatches?: number;
  tooAmbiguous?: number;
  exitCode?: number;
  failCategory?: string;
  failReason?: string;
}): Promise<void> {
  const p = params;
  await db.execute(sql`
    INSERT INTO agent_runs (
      worker_id, api_key_hash, run_number, platform, status, started_at,
      ended_at, wall_time_secs, claude_time_secs, api_time_secs, turns,
      batch_size, resolved, excluded, skipped, errors,
      high_confidence, medium_confidence, conflicts, name_mismatches, too_ambiguous,
      exit_code, fail_category, fail_reason
    ) VALUES (
      ${p.workerId}, ${p.apiKeyHash}, ${p.runNumber}, ${p.platform ?? 'deezer'}, ${p.status}, ${p.startedAt},
      ${p.endedAt ?? null}, ${p.wallTimeSecs ?? null}, ${p.claudeTimeSecs ?? null}, ${p.apiTimeSecs ?? null}, ${p.turns ?? null},
      ${p.batchSize ?? null}, ${p.resolved ?? 0}, ${p.excluded ?? 0}, ${p.skipped ?? 0}, ${p.errors ?? 0},
      ${p.highConfidence ?? 0}, ${p.mediumConfidence ?? 0}, ${p.conflicts ?? 0}, ${p.nameMismatches ?? 0}, ${p.tooAmbiguous ?? 0},
      ${p.exitCode ?? null}, ${p.failCategory ?? null}, ${p.failReason ?? null}
    )
    ON CONFLICT (worker_id, run_number) DO UPDATE SET
      status = EXCLUDED.status,
      ended_at = COALESCE(EXCLUDED.ended_at, agent_runs.ended_at),
      wall_time_secs = COALESCE(EXCLUDED.wall_time_secs, agent_runs.wall_time_secs),
      claude_time_secs = COALESCE(EXCLUDED.claude_time_secs, agent_runs.claude_time_secs),
      api_time_secs = COALESCE(EXCLUDED.api_time_secs, agent_runs.api_time_secs),
      turns = COALESCE(EXCLUDED.turns, agent_runs.turns),
      batch_size = COALESCE(EXCLUDED.batch_size, agent_runs.batch_size),
      resolved = EXCLUDED.resolved,
      excluded = EXCLUDED.excluded,
      skipped = EXCLUDED.skipped,
      errors = EXCLUDED.errors,
      high_confidence = EXCLUDED.high_confidence,
      medium_confidence = EXCLUDED.medium_confidence,
      conflicts = EXCLUDED.conflicts,
      name_mismatches = EXCLUDED.name_mismatches,
      too_ambiguous = EXCLUDED.too_ambiguous,
      exit_code = COALESCE(EXCLUDED.exit_code, agent_runs.exit_code),
      fail_category = COALESCE(EXCLUDED.fail_category, agent_runs.fail_category),
      fail_reason = COALESCE(EXCLUDED.fail_reason, agent_runs.fail_reason)
  `);
}

export async function getRunHistory(limit = 50, offset = 0): Promise<{ runs: AgentRun[]; total: number }> {
  const [countResult, rows] = await Promise.all([
    db.execute<{ total: number }>(sql`SELECT COUNT(*)::int AS total FROM agent_runs`),
    db.execute<{
      worker_id: string; run_number: number; platform: string; status: string;
      started_at: string; ended_at: string | null;
      wall_time_secs: number | null; claude_time_secs: number | null;
      api_time_secs: number | null; turns: number | null;
      batch_size: number | null;
      resolved: number; excluded: number; skipped: number; errors: number;
      high_confidence: number; medium_confidence: number;
      conflicts: number; name_mismatches: number; too_ambiguous: number;
      exit_code: number | null; fail_category: string | null; fail_reason: string | null;
    }>(sql`
      SELECT worker_id, run_number, platform, status,
        started_at, ended_at, wall_time_secs, claude_time_secs, api_time_secs, turns,
        batch_size, resolved, excluded, skipped, errors,
        high_confidence, medium_confidence, conflicts, name_mismatches, too_ambiguous,
        exit_code, fail_category, fail_reason
      FROM agent_runs
      ORDER BY started_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
  ]);

  return {
    total: countResult[0]?.total ?? 0,
    runs: [...rows].map(r => ({
      workerId: r.worker_id,
      runNumber: r.run_number,
      platform: r.platform,
      status: r.status,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      wallTimeSecs: r.wall_time_secs,
      claudeTimeSecs: r.claude_time_secs,
      apiTimeSecs: r.api_time_secs,
      turns: r.turns,
      batchSize: r.batch_size,
      resolved: r.resolved,
      excluded: r.excluded,
      skipped: r.skipped,
      errors: r.errors,
      highConfidence: r.high_confidence,
      mediumConfidence: r.medium_confidence,
      conflicts: r.conflicts,
      nameMismatches: r.name_mismatches,
      tooAmbiguous: r.too_ambiguous,
      exitCode: r.exit_code,
      failCategory: r.fail_category,
      failReason: r.fail_reason,
    })),
  };
}
