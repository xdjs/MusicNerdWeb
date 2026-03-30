# Cross-Platform Artist ID Mapping Agent

Automated agent that resolves Deezer IDs for artists in the MusicNerd database using a tiered lookup strategy: Wikidata SPARQL → MusicBrainz → Google Search → Deezer name search. Artists that can't be mapped (name mismatches, conflicts, ambiguous names) are excluded from future batches to prevent wasted turns. Runs as a Claude Code session with MCP tools for database access.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- `envsubst` (from GNU gettext — pre-installed on most Linux; on macOS: `brew install gettext`)
- An MCP API key for the MusicNerd server (provision via admin UI at `/admin/mcp-keys` or [SQL](../../CLAUDE.md#api-key-provisioning))

## Setup

```bash
# Required: your MCP API key
export MCP_API_KEY="your-key-here"

# Optional: override the MCP server URL (defaults to https://musicnerd.xyz/api/mcp)
export MCP_URL="https://musicnerd.xyz/api/mcp"
```

## Running

```bash
./agents/id-mapping/claude-runner.sh
```

### Against local dev server

```bash
# Against a deployed staging/dev URL (recommended):
MCP_URL=https://staging.musicnerd.xyz/api/mcp \
MCP_API_KEY=your-dev-key \
BATCH_SIZE=5 \
./agents/id-mapping/claude-runner.sh

# Against localhost (requires a real cert — self-signed certs may cause hangs):
npm run dev  # in another terminal
MCP_URL=https://localhost:3000/api/mcp \
MCP_API_KEY=your-dev-key \
BATCH_SIZE=5 \
./agents/id-mapping/claude-runner.sh
```

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `MCP_API_KEY` | (required) | MCP API key for write operations |
| `MCP_URL` | `https://musicnerd.xyz/api/mcp` | MCP server endpoint |
| `BATCH_SIZE` | `50` | Number of artists to process per session |
| `VERBOSE` | `0` | Set to `1` for stream-json + verbose debug output |

## How It Works

1. Calls `get_mapping_stats` to check current coverage
2. Calls `get_unmapped_artists("deezer", limit=BATCH_SIZE)` to get a work batch
3. **Tier 1 — Wikidata SPARQL:** Batch-queries Spotify IDs against Wikidata for verified cross-platform mappings. Highest confidence, covers ~40-60% of well-known artists.
4. **Tier 2 — MusicBrainz:** Looks up remaining artists via MusicBrainz relationships (by MBID or name search). 1 req/sec rate limit. Covers ~20-30% of remaining.
5. **Tier 2.5 — Google Search:** Searches for Deezer artist pages via Google. Also cross-verifies Tier 1/2 results (conflicts cause exclusion).
6. **Tier 3 — Deezer name search:** Direct search with agent judgment on match quality. Assigns high or medium confidence based on name uniqueness, fan count, and album count.
7. **Exclusions:** Artists that fail verification (name mismatch), have conflicting IDs, or are too ambiguous are excluded via `exclude_artist_mapping` so they don't reappear in future batches.
8. Reports session summary with per-tier, per-confidence, and exclusion breakdowns

## Monitoring

Check mapping progress anytime:

```bash
# Via MCP tool (if you have an MCP client)
# Call get_mapping_stats — returns total artists, mapped/unmapped per platform, confidence breakdown

# Via database
psql $SUPABASE_DB_CONNECTION -c "
  SELECT platform, confidence, count(*)
  FROM artist_id_mappings
  GROUP BY platform, confidence
  ORDER BY platform, confidence;
"
```

## Running at Scale

For processing the full catalog (~38k artists), run unattended on a DigitalOcean droplet (or any Ubuntu/Debian server).

### Droplet Setup

```bash
# SSH into your droplet and run the provisioning script
sudo ./agents/id-mapping/setup-droplet.sh

# Authenticate Claude Code (OAuth — uses your Max/Pro subscription)
claude login

# Create env file with required vars
cat > ~/.env.mapping <<'EOF'
export MCP_API_KEY="your-key-here"
export MCP_URL="https://musicnerd.xyz/api/mcp"
export BATCH_SIZE=50
export MAX_ITERATIONS=400
export LOG_DIR=$HOME/tmp/id-mapping
EOF
```

### Launching Workers

Use `start-workers.sh` to launch tmux sessions with crash resilience (sessions survive script exits):

```bash
# Single worker
./agents/id-mapping/start-workers.sh ~/.env.mapping

# Two parallel workers
./agents/id-mapping/start-workers.sh ~/.env.mapping -n 2

# Custom session prefix
./agents/id-mapping/start-workers.sh ~/.env.mapping -n 2 -s mapping
# Creates: mapping-w1, mapping-w2

# Check progress without reattaching
./agents/id-mapping/check-status.sh

# Attach to a worker
tmux attach -t id-mapping-w1

# List active sessions
tmux ls
```

Workers naturally diverge as each resolves/excludes different artists from the shared pool. No offset coordination needed — upserts and unique constraints handle overlap safely.

**Resource requirements:** Each worker runs a `claude` CLI process (~200-400MB RAM). On a 4GB droplet, 2 workers is the practical max.

### Full Catalog Runner Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `MCP_API_KEY` | (required) | MCP API key for write operations |
| `MCP_URL` | (required) | MCP server endpoint |
| `BATCH_SIZE` | `50` | Artists per batch |
| `MAX_ITERATIONS` | `800` | Maximum number of batch runs |
| `LOG_DIR` | `/var/log/id-mapping` | Where to write per-run log files |
| `SLEEP_BETWEEN` | `10` | Seconds between successful runs |
| `BATCH_TIMEOUT` | `600` | Timeout per batch in seconds (10 min) |
| `RATE_LIMIT_BACKOFF` | `300` | Seconds to wait after a rate limit error (5 min) |

### Local Testing

```bash
# Quick test with 2 iterations of 5 artists
MAX_ITERATIONS=2 BATCH_SIZE=5 LOG_DIR=/tmp/id-mapping \
  MCP_API_KEY=your-key MCP_URL=https://staging.musicnerd.xyz/api/mcp \
  ./agents/id-mapping/run-full-catalog.sh

# Check the logs
LOG_DIR=/tmp/id-mapping ./agents/id-mapping/check-status.sh
```

### Failure Handling

The runner automatically classifies failures and responds appropriately:

| Category | Examples | Behavior |
|----------|----------|----------|
| **Rate limit** | 429, usage limit, quota exceeded | Backs off `RATE_LIMIT_BACKOFF` seconds (default 5 min) |
| **Auth error** | 401, token expired | Stops immediately — manual `claude login` needed |
| **Fatal** | SIGKILL (OOM), SIGINT | Stops immediately |
| **Transient** | Timeout, network error, context limit | Retries after 30s, stops after 3 consecutive |

All loop-level events are written to `{WORKER_ID}-runner.log` for post-mortem analysis:

```bash
# See why a worker stopped
cat ~/tmp/id-mapping/12345-runner.log
```

### Troubleshooting

- **Auth expiry**: The runner detects auth errors and stops immediately. Run `claude login` to re-authenticate, then restart.
- **Rate limits**: The runner automatically backs off for 5 minutes. MusicBrainz's 1 req/sec limit is handled by the agent itself.
- **Crashes**: `start-workers.sh` sets `remain-on-exit` on tmux sessions, so they stay visible after a crash. Use `tmux attach -t <session>` to see the exit state.
- **Restarting mid-run**: Safe at any point. `get_unmapped_artists` skips already-resolved and excluded artists, so no work is duplicated.
- **Disk space**: Each log file is ~50-200KB. 800 runs ≈ 40-160MB. Monitor with `du -sh $LOG_DIR`.

## Programmatic Resolver (Tier 1 + 2)

A standalone script that replaces the LLM-driven Wikidata and MusicBrainz lookups with deterministic API calls. Runs as a two-step process: collect data from external APIs into a JSONL file, then import into the DB.

See `docs/programmatic-id-mapping-plan.md` for the full design.

### Why

The Claude agent costs ~$0.227/artist. Tiers 1 and 2 (Wikidata SPARQL + MusicBrainz) are fully deterministic — no LLM judgment needed. The programmatic resolver handles these at near-zero cost, leaving only the harder cases (Tier 2.5 Google search + Tier 3 name matching) for the Claude agent.

Additionally, the script expands the Wikidata SPARQL query from 4 to 20 properties, harvesting social links (X, Instagram, Facebook), platform handles (Discogs, Last.fm, SoundCloud, IMDb, YouTube), and additional platform IDs (Genius, AllMusic, Billboard, Rolling Stone) in the same pass.

### Usage

```bash
# Set up env (needs DB connection string from .env.local)
set -a && source .env.local && set +a

# Step 1: Collect data from Wikidata + MusicBrainz → JSONL file
npx tsx agents/id-mapping/programmatic-resolver.ts collect \
  --out data/wikidata-enrichment.jsonl

# Review the output
wc -l data/wikidata-enrichment.jsonl
head -1 data/wikidata-enrichment.jsonl | python3 -m json.tool

# Step 2: Import into DB
npx tsx agents/id-mapping/programmatic-resolver.ts import \
  --file data/wikidata-enrichment.jsonl
```

### Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `SUPABASE_DB_CONNECTION` | (required) | Postgres connection string |
| `WIKIDATA_BATCH` | `80` | Spotify IDs per SPARQL query |
| `DRY_RUN` | `0` | Set to `1` to skip writes in import step |

### Collect step

1. Loads all artists with Spotify IDs from the DB (~39k)
2. **Tier 1 — Wikidata SPARQL:** Batches of 80 Spotify IDs, fetching 20 properties (platform IDs, social handles, Wikidata entity ID). Deezer IDs are verified via the Deezer API (name match). ~8 min for the full catalog.
3. **Tier 2 — MusicBrainz:** For artists still missing a Deezer ID after Wikidata. Fetches relationships by MBID (if known from Wikidata) or name search. 1 req/s rate limit. ~7-11 hours.
4. Outputs a JSONL file (one artist per line) with crash-safe append semantics. On restart, skips already-processed artists.

### Import step

1. Reads the JSONL file
2. Bulk inserts platform IDs into `artist_id_mappings` (`ON CONFLICT DO NOTHING`)
3. Updates `artists` table columns (wikidata, discogs, instagram, x, etc.) — only empty columns, never overwrites existing data
4. Writes conflicts (DB value differs from Wikidata) to a separate `*-conflicts.json` file for manual review
5. Idempotent — re-running is a no-op

### After the programmatic resolver — Phase 2

The remaining ~15k artists need LLM judgment (Google search + Deezer name matching). Use the Phase 2 prompt which strips Tiers 1 and 2 (already handled by the programmatic resolver) and switches to Haiku (~12x cheaper than Sonnet).

```bash
# Single worker
MODEL=haiku \
PROMPT_FILE=agents/id-mapping/prompt-phase2.md \
./agents/id-mapping/run-full-catalog.sh

# Two parallel workers (add MODEL and PROMPT_FILE to ~/.env.mapping first)
# echo 'MODEL=haiku' >> ~/.env.mapping
# echo 'PROMPT_FILE=agents/id-mapping/prompt-phase2.md' >> ~/.env.mapping
./agents/id-mapping/start-workers.sh ~/.env.mapping -n 2
```

| Env Var | Value | Why |
|---------|-------|-----|
| `MODEL` | `haiku` | ~12x cheaper than Sonnet, sufficient for name matching |
| `PROMPT_FILE` | `agents/id-mapping/prompt-phase2.md` | Stripped to Tiers 2.5 + 3 only, reduces input tokens |

The Phase 2 prompt:
- Removes Tier 1 (Wikidata) and Tier 2 (MusicBrainz) — already done programmatically
- Removes cross-verification (Tier 2.5 was only needed to verify Tier 1/2 results)
- Keeps Google search as discovery (Tier 1 in Phase 2) and Deezer name search (Tier 2 in Phase 2)
- Same batching, exclusion, and verification rules

## Architecture

- `prompt.md` — Full system prompt (all 4 tiers, used by Phase 1 agents)
- `prompt-phase2.md` — Simplified prompt (Google search + Deezer name search only, used after programmatic resolver)
- `mcp-config.json` — MCP server connection template (env vars substituted at runtime)
- `claude-runner.sh` — Shell wrapper that substitutes env vars and invokes Claude Code CLI. Supports `PROMPT_FILE` env var to override the default prompt.
- `run-full-catalog.sh` — Durable loop runner with failure classification and rate limit backoff
- `start-workers.sh` — Launches workers in crash-resilient tmux sessions
- `check-status.sh` — Quick progress checker with per-worker breakdown
- `setup-droplet.sh` — One-time droplet provisioning script
- `programmatic-resolver.ts` — Deterministic Tier 1+2 script (collect + import)

The agent makes no application code changes. All reads/writes go through MCP tools, which share the same validation and audit logging as the web app. The programmatic resolver writes directly to the DB (no MCP, no audit logging — the JSONL file is the audit trail).
