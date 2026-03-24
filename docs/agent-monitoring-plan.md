# Agent Monitoring: Activity Indicators + Worker Heartbeats

## Context

The id-mapping agents run on a remote droplet, calling the MCP API on Vercel. Currently the only way to check status is SSH + `check-status.sh`. The admin UI's Agent Work tab shows historical data but nothing about live activity or worker health. After the first 8-hour run surfaced issues (zombie re-processing, undetected token expiry), we need better observability.

**Scope:** Tier 1 (activity indicators from existing data) + Tier 2 (worker heartbeats via new endpoint).

---

## Tier 1: Activity Indicators

Use existing `mcp_audit_log` timestamps to show near-real-time activity. No new tables.

### 1.1 Database: Add index (migration)

```sql
CREATE INDEX idx_mcp_audit_log_created_at ON mcp_audit_log (created_at DESC);
```

Add to `schema.ts` alongside existing indexes.

### 1.2 New queries in `agentWorkQueries.ts`

- **`getActivityPulse()`** — returns `{ lastWriteAt, rateLastHour }`
  - `SELECT MAX(created_at) FROM mcp_audit_log`
  - `SELECT COUNT(*) FROM mcp_audit_log WHERE created_at > NOW() - INTERVAL '1 hour'`

- **`getHourlyActivity()`** — returns 24 hourly buckets
  ```sql
  SELECT date_trunc('hour', created_at) AS hour,
         COUNT(*) FILTER (WHERE action = 'resolve')::int AS resolve_count,
         COUNT(*) FILTER (WHERE action = 'exclude')::int AS exclude_count
  FROM mcp_audit_log
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY 1 ORDER BY 1
  ```

- **Extend `getMappingStats()`** — add "+N today" per platform
  ```sql
  SELECT platform, COUNT(*)::int AS today
  FROM artist_id_mappings
  WHERE created_at >= CURRENT_DATE
  GROUP BY platform
  ```

- **Extend `getAgentBreakdown()`** — add `lastActiveAt` per agent
  - Join `MAX(created_at)` from `mcp_audit_log` grouped by `api_key_hash`

### 1.3 Extend API response

Add to `AgentWorkData` type:
```typescript
activityPulse: {
  lastWriteAt: string | null;
  rateLastHour: number;
};
hourlyActivity: {
  hour: string;
  resolveCount: number;
  excludeCount: number;
}[];
```

Add `todayCount` to each platform stat. Add `lastActiveAt` to `AgentBreakdownRow`.

All new queries join the existing `Promise.all` in `getAgentWorkData()`.

### 1.4 UI additions in `AgentWorkSection.tsx`

- **Activity pulse bar** at top of section: green/yellow/red dot (green <5min, yellow <30min, red >30min), "Last write: X ago", "Rate: N/hr"
- **Hourly sparkline**: 24 `div` bars with Tailwind heights proportional to max count. Pure CSS, no charting library.
- **"+N today"** below percentage on each platform card
- **"Last Active"** column in agent breakdown table

### Files
- `src/server/utils/queries/agentWorkQueries.ts` — new queries + extend types
- `src/app/api/admin/agent-work/route.ts` — pass new data through
- `src/app/admin/AgentWorkSection.tsx` — pulse bar, sparkline, +today, last active
- `src/server/db/schema.ts` — add index
- New migration file for the index

---

## Tier 2: Worker Heartbeats

Workers report their status to the database. Admin UI shows live worker health.

### 2.1 Database: New `agent_heartbeats` table

```sql
CREATE TABLE agent_heartbeats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'starting',
  current_run INTEGER,
  batch_platform TEXT,
  batch_size INTEGER,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  config JSONB
);

CREATE INDEX idx_agent_heartbeats_updated_at ON agent_heartbeats (updated_at DESC);
```

Add to `schema.ts` as `agentHeartbeats` table. `worker_id` has UNIQUE constraint — upsert per worker. No FK on `api_key_hash` (same pattern as `mcp_audit_log`).

### 2.2 New API endpoint: `POST /api/agent/heartbeat`

**Location:** `src/app/api/agent/heartbeat/route.ts`

**Auth:** Bearer token validated via `validateMcpApiKey()` from `src/app/api/mcp/auth.ts`. Extract that function (or import directly — it has no MCP-transport dependency).

**Request body:**
```typescript
{
  workerId: string;
  status: "starting" | "running" | "idle" | "error" | "stopping";
  currentRun?: number;
  batchPlatform?: string;
  batchSize?: number;
  message?: string;
  config?: Record<string, unknown>;
}
```

**Logic:** Upsert into `agent_heartbeats` on `worker_id`. Set `updated_at = now()`. On first insert, also set `started_at = now()`.

### 2.3 New queries: `src/server/utils/queries/heartbeatQueries.ts`

- **`upsertHeartbeat()`** — INSERT ... ON CONFLICT (worker_id) DO UPDATE
- **`getActiveWorkers()`** — returns all heartbeats with computed status:
  ```sql
  SELECT *,
    CASE
      WHEN status IN ('stopping', 'error') THEN 'stopped'
      WHEN updated_at < NOW() - INTERVAL '11 minutes' THEN 'dead'
      WHEN status = 'idle' THEN 'idle'
      ELSE 'running'
    END AS computed_status
  FROM agent_heartbeats
  ORDER BY updated_at DESC
  ```

### 2.4 Extend admin API

Add `workers` to `AgentWorkData`:
```typescript
workers: {
  workerId: string;
  status: string;
  computedStatus: "running" | "idle" | "stopped" | "dead";
  currentRun: number | null;
  batchPlatform: string | null;
  batchSize: number | null;
  message: string | null;
  startedAt: string;
  updatedAt: string;
  config: Record<string, unknown> | null;
}[];
```

### 2.5 Shell changes: `agents/id-mapping/run-full-catalog.sh`

Add `heartbeat()` function:
```bash
heartbeat() {
  local status="$1"
  local message="${2:-}"
  local heartbeat_url="${HEARTBEAT_URL:-${MCP_URL%/mcp}/agent/heartbeat}"
  curl -s -X POST "$heartbeat_url" \
    -H "Authorization: Bearer $MCP_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"workerId\": \"$WORKER_ID\",
      \"status\": \"$status\",
      \"currentRun\": $completed_runs,
      \"batchPlatform\": \"deezer\",
      \"batchSize\": $BATCH_SIZE,
      \"message\": $(printf '%s' "$message" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),
      \"config\": {
        \"batchSize\": $BATCH_SIZE,
        \"maxIterations\": $MAX_ITERATIONS,
        \"sleepBetween\": $SLEEP_BETWEEN,
        \"batchTimeout\": $BATCH_TIMEOUT
      }
    }" >/dev/null 2>&1 || true
}
```

**Call points (7 insertions):**
1. After banner — `heartbeat "starting" "Worker starting"`
2. Before `claude-runner.sh` — `heartbeat "running" "Starting run $run_num"`
3. After successful batch — `heartbeat "running" "Run $run_num complete: ..."`
4. On rate limit backoff — `heartbeat "idle" "Rate limited, backing off ${RATE_LIMIT_BACKOFF}s"`
5. On sleep between batches — `heartbeat "idle" "Sleeping ${SLEEP_BETWEEN}s"`
6. On failure — `heartbeat "error" "$fail_reason"`
7. At end (cleanup) — `heartbeat "stopping" "Finished: $stop_reason"`

### 2.6 UI: WorkerStatusPanel in `AgentWorkSection.tsx`

New component at top of Agent Work tab (above the activity pulse):
- Card per worker: worker ID, status badge (green running / yellow idle / red dead / gray stopped), current run #, batch platform, uptime, last heartbeat relative time, message text
- Workers dead >24h hidden behind "Show inactive" toggle

### Files
- `src/server/db/schema.ts` — new `agentHeartbeats` table
- New migration for `agent_heartbeats` table
- `src/app/api/agent/heartbeat/route.ts` — new endpoint
- `src/server/utils/queries/heartbeatQueries.ts` — new query file
- `src/server/utils/queries/agentWorkQueries.ts` — add workers to `getAgentWorkData()`
- `src/app/api/admin/agent-work/route.ts` — pass workers through
- `src/app/admin/AgentWorkSection.tsx` — WorkerStatusPanel component
- `agents/id-mapping/run-full-catalog.sh` — heartbeat() function + 7 call sites

---

## Implementation Order

1. Migration: add `mcp_audit_log` index + `agent_heartbeats` table
2. Tier 1 queries + API response extension
3. Tier 1 UI (pulse, sparkline, +today, last active)
4. Tier 2 heartbeat endpoint + queries
5. Tier 2 shell script changes
6. Tier 2 UI (WorkerStatusPanel)
7. Test with `run-test.sh`

## Verification

1. **Tier 1:** Load admin Agent Work tab. Verify pulse shows correct "last write" time. Cross-check sparkline against `SELECT date_trunc('hour', created_at), COUNT(*) FROM mcp_audit_log WHERE created_at > NOW() - '24 hours' GROUP BY 1` via devdb.
2. **Tier 2:** Run `run-test.sh` (3 batches). Verify worker appears in admin UI with "running" status, message updates per batch. After test completes, verify status changes to "stopping". Wait 11 min, verify it shows as "dead".
3. **API test:** `curl -X POST .../api/agent/heartbeat -H "Authorization: Bearer $MCP_API_KEY" -d '{"workerId":"test","status":"running","message":"manual test"}'` — verify 200 and row appears in `agent_heartbeats`.

---

## Future Tiers (not in scope)

- **Tier 3: Run Tracking** — `agent_runs` table with per-batch metrics (wall time, tier breakdown, confidence distribution). Populated by `run-full-catalog.sh` parsing session reports.
- **Tier 4: Live Dashboard** — Auto-polling (10s for pulse/workers, 60s for stats) with pause button.
- **Tier 5-lite: Discord Alerts** — Push notifications when workers die, hit auth errors, or finish work.
- **Tier 5: Remote Management** — Start/stop/configure workers from admin UI via droplet API.
