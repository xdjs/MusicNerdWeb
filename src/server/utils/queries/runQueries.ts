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
