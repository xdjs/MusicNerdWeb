import { db } from "@/server/db/drizzle";
import { sql } from "drizzle-orm";

export interface WorkerHeartbeat {
  workerId: string;
  apiKeyHash: string;
  status: string;
  computedStatus: "running" | "idle" | "stopped" | "error" | "dead";
  currentRun: number | null;
  batchPlatform: string | null;
  batchSize: number | null;
  message: string | null;
  startedAt: string;
  updatedAt: string;
  config: Record<string, unknown> | null;
}

export async function getActiveWorkers(): Promise<WorkerHeartbeat[]> {
  const rows = await db.execute<{
    worker_id: string;
    api_key_hash: string;
    status: string;
    computed_status: string;
    current_run: number | null;
    batch_platform: string | null;
    batch_size: number | null;
    message: string | null;
    started_at: string;
    updated_at: string;
    config: Record<string, unknown> | null;
  }>(sql`
    SELECT *,
      CASE
        WHEN status = 'error' THEN 'error'
        WHEN status = 'stopping' THEN 'stopped'
        WHEN updated_at < NOW() - MAKE_INTERVAL(secs =>
          COALESCE((config->>'batchTimeout')::int, 900) + 120
        ) THEN 'dead'
        WHEN status = 'idle' THEN 'idle'
        ELSE 'running'
      END AS computed_status
    FROM agent_heartbeats
    ORDER BY updated_at DESC
  `);
  return [...rows].map(r => ({
    workerId: r.worker_id,
    apiKeyHash: r.api_key_hash,
    status: r.status,
    computedStatus: r.computed_status as WorkerHeartbeat["computedStatus"],
    currentRun: r.current_run,
    batchPlatform: r.batch_platform,
    batchSize: r.batch_size,
    message: r.message,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    config: r.config,
  }));
}
