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

# Set env vars (add to ~/.bashrc for persistence)
export MCP_API_KEY="your-key-here"
export MCP_URL="https://musicnerd.xyz/api/mcp"
```

### tmux Workflow

```bash
# Single worker
tmux new -s id-mapping
./agents/id-mapping/run-full-catalog.sh
# Detach: Ctrl-b d

# Reattach later:
tmux attach -t id-mapping

# Check progress without reattaching:
./agents/id-mapping/check-status.sh
```

### Parallel Workers

For faster processing, run multiple workers in separate tmux sessions. Workers naturally diverge as each resolves/excludes different artists from the shared pool. No offset coordination needed — upserts and unique constraints handle overlap safely.

```bash
# Source env vars, then launch 2 workers
tmux new-session -d -s w1 'source .env.mapping && BATCH_SIZE=50 MAX_ITERATIONS=400 ./agents/id-mapping/run-full-catalog.sh'
tmux new-session -d -s w2 'source .env.mapping && BATCH_SIZE=50 MAX_ITERATIONS=400 ./agents/id-mapping/run-full-catalog.sh'

# check-status.sh shows per-worker breakdown automatically
./agents/id-mapping/check-status.sh
```

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

### Local Testing

```bash
# Quick test with 2 iterations of 5 artists
MAX_ITERATIONS=2 BATCH_SIZE=5 LOG_DIR=/tmp/id-mapping \
  MCP_API_KEY=your-key MCP_URL=https://staging.musicnerd.xyz/api/mcp \
  ./agents/id-mapping/run-full-catalog.sh

# Check the logs
LOG_DIR=/tmp/id-mapping ./agents/id-mapping/check-status.sh
```

### Troubleshooting

- **Auth expiry**: Claude Code OAuth tokens expire. If you see 3 consecutive failures, reattach tmux and run `claude login` to re-authenticate, then restart the loop.
- **Rate limits**: The agent already respects MusicBrainz's 1 req/sec limit. If the MCP server rate-limits, increase `SLEEP_BETWEEN`.
- **Restarting mid-run**: Safe to restart at any point. `get_unmapped_artists` skips already-resolved and excluded artists, so no work is duplicated.
- **Disk space**: Each log file is ~50-200KB. 800 runs ≈ 40-160MB. Monitor with `du -sh $LOG_DIR`.

## Architecture

- `prompt.md` — Full system prompt with the tiered resolution strategy
- `mcp-config.json` — MCP server connection template (env vars substituted at runtime)
- `claude-runner.sh` — Shell wrapper that substitutes env vars and invokes Claude Code CLI
- `run-full-catalog.sh` — Durable loop runner for processing the full catalog
- `check-status.sh` — Quick progress checker (run from any SSH session)
- `setup-droplet.sh` — One-time droplet provisioning script

The agent makes no application code changes. All reads/writes go through MCP tools, which share the same validation and audit logging as the web app.
