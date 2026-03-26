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

export async function upsertHeartbeat(params: {
  workerId: string;
  apiKeyHash: string;
  status: string;
  currentRun?: number;
  batchPlatform?: string;
  batchSize?: number;
  message?: string;
  config?: Record<string, unknown>;
}): Promise<void> {
  const { workerId, apiKeyHash, status, currentRun, batchPlatform, batchSize, message, config } = params;
  await db.execute(sql`
    INSERT INTO agent_heartbeats (worker_id, api_key_hash, status, current_run, batch_platform, batch_size, message, config, started_at, updated_at)
    VALUES (${workerId}, ${apiKeyHash}, ${status}, ${currentRun ?? null}, ${batchPlatform ?? null}, ${batchSize ?? null}, ${message ?? null}, ${config ? JSON.stringify(config) : null}::jsonb, now(), now())
    ON CONFLICT (worker_id) DO UPDATE SET
      api_key_hash = EXCLUDED.api_key_hash,
      status = EXCLUDED.status,
      current_run = EXCLUDED.current_run,
      batch_platform = EXCLUDED.batch_platform,
      batch_size = EXCLUDED.batch_size,
      message = EXCLUDED.message,
      config = EXCLUDED.config,
      updated_at = now()
  `);
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
