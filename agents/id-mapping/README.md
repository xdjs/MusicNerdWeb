# Cross-Platform Artist ID Mapping Agent

Automated agent that resolves Deezer IDs for artists in the MusicNerd database using a tiered lookup strategy: Wikidata SPARQL → MusicBrainz → Deezer name search. Runs as a Claude Code session with MCP tools for database access.

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

## How It Works

1. Calls `get_mapping_stats` to check current coverage
2. Calls `get_unmapped_artists("deezer", limit=BATCH_SIZE)` to get a work batch
3. **Tier 1 — Wikidata SPARQL:** Batch-queries Spotify IDs against Wikidata for verified cross-platform mappings. Highest confidence, covers ~40-60% of well-known artists.
4. **Tier 2 — MusicBrainz:** Looks up remaining artists via MusicBrainz relationships (by MBID or name search). 1 req/sec rate limit. Covers ~20-30% of remaining.
5. **Tier 3 — Deezer name search:** Direct search with agent judgment on match quality. Assigns high or medium confidence based on name uniqueness, fan count, and album count.
6. Reports session summary with per-tier and per-confidence breakdowns

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

## Architecture

- `prompt.md` — Full system prompt with the tiered resolution strategy
- `mcp-config.json` — MCP server connection template (env vars substituted at runtime)
- `claude-runner.sh` — Shell wrapper that substitutes env vars and invokes Claude Code CLI

The agent makes no application code changes. All reads/writes go through MCP tools, which share the same validation and audit logging as the web app.
