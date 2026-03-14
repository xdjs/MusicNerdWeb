# Cross-Platform Artist ID Mapping Agent — Implementation Plan

> PRD: `docs/id-mapping-agent-prd.md`
> Infrastructure (done): `docs/id-mapping-infrastructure-plan.md`

## Context

The DB schema and MCP tools for cross-platform artist ID mapping are deployed (PR #1045). We now need to build the **resolution agent** — a prompt-driven AI agent that connects to the MCP server, calls external APIs (Wikidata, MusicBrainz, Deezer), and resolves Spotify artist IDs to Deezer IDs using the tiered strategy from the PRD.

**Decisions made:**
- **Form:** LLM-agnostic system prompt + Claude Code runner script
- **Secrets:** Env var `MCP_API_KEY` referenced in MCP config, no secrets in committed files
- **Platform scope:** Deezer only (architecture supports others later)
- **Location:** `agents/id-mapping/`
- **Verification:** Manual test run against devdb (5-10 artists)

## Why One Worker

This is a single deliverable — a prompt file, a runner config, and a README. No application code changes. No tests to write (it's a prompt, not code). One worker, one PR.

## Deliverables

### File Structure

```
agents/id-mapping/
├── README.md              # How to set up, configure, and run the agent
├── prompt.md              # The full system prompt (LLM-agnostic)
├── claude-runner.sh       # Shell script to invoke Claude Code CLI
└── mcp-config.json        # MCP server connection config (references $MCP_API_KEY)
```

### 1. System Prompt (`prompt.md`)

The core deliverable. A detailed system prompt that instructs any LLM to act as the resolution agent. Sections:

**Role & Goal** — You are a cross-platform artist ID resolution agent. Your job is to find Deezer IDs for artists in the MusicNerd database.

**Session Lifecycle** — From the PRD:
1. `get_mapping_stats` → understand current state
2. `get_unmapped_artists("deezer", limit=50)` → get work batch
3. For each artist: Tier 1 → Tier 2 → Tier 3 → skip
4. `get_mapping_stats` → report progress

**Tier 1 — Wikidata SPARQL** — Full SPARQL query template with `VALUES` clause for batch lookup. Property codes (P1902, P2722, P2850, P434). Requires `User-Agent: MusicNerdWeb/1.0 (https://musicnerd.xyz; contact@musicnerd.xyz)`. On match: save all platform IDs found (opportunistic cross-platform saves). Multi-value edge case handling (verify via Deezer API, pick primary by fan count).

**Tier 2 — MusicBrainz** — Two paths: Path A (has MBID) → fetch relationships, Path B (no MBID) → name search + disambiguation. Rate limit: 1 req/sec (mandatory). Parse URL relationships for Deezer URLs. `User-Agent` header required.

**Tier 3 — Deezer Name Search** — `GET https://api.deezer.com/search/artist?q={name}&limit=5`. Decision framework based on name match quality, fan count plausibility, album count, name uniqueness. Confidence assignment rules. Reasoning is required for all Tier 3 matches.

**Name Normalization** — Case-insensitive, Unicode NFD, strip "The ", strip feat. suffixes, trim whitespace.

**MCP Tool Reference** — Brief description of each tool and its arguments (the agent has tool schemas available, but the prompt should explain *when* to use each one).

**Error Handling** — From PRD: API failures → fall through to next tier. Rate limit 503 → wait 2s, retry once. `resolve_artist_id` skipped → normal, move on.

**Constraints** — Accuracy over coverage. No destructive operations. Respect rate limits. Conservative on ambiguity.

**Reporting** — At session end, report: batch size, resolved by tier, resolved by confidence, skipped count, errors, updated stats.

### 2. MCP Config (`mcp-config.json`)

```json
{
  "mcpServers": {
    "music-nerd": {
      "type": "streamable-http",
      "url": "${MCP_URL:-https://musicnerd.xyz/api/mcp}",
      "headers": {
        "Authorization": "Bearer ${MCP_API_KEY}"
      }
    }
  }
}
```

Note: Claude Code's MCP config may not support env var interpolation natively. The runner script will handle substitution.

### 3. Runner Script (`claude-runner.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

# Required env vars
: "${MCP_API_KEY:?Set MCP_API_KEY to your MusicNerd MCP API key}"

# Optional config
MCP_URL="${MCP_URL:-https://musicnerd.xyz/api/mcp}"
BATCH_SIZE="${BATCH_SIZE:-50}"

# Generate MCP config with env vars substituted
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE=$(mktemp)
trap "rm -f $CONFIG_FILE" EXIT

sed "s|\${MCP_API_KEY}|${MCP_API_KEY}|g; s|\${MCP_URL:-https://musicnerd.xyz/api/mcp}|${MCP_URL}|g" \
  "$SCRIPT_DIR/mcp-config.json" > "$CONFIG_FILE"

# Run the agent
claude --system-prompt "$SCRIPT_DIR/prompt.md" \
  --mcp-config "$CONFIG_FILE" \
  "Resolve Deezer IDs for unmapped artists. Batch size: ${BATCH_SIZE}."
```

### 4. README (`README.md`)

- What this agent does (one paragraph)
- Prerequisites: MCP API key (link to admin UI or SQL provisioning), Claude Code CLI
- Setup: export `MCP_API_KEY`, optionally `MCP_URL` for dev
- Running: `./agents/id-mapping/claude-runner.sh`
- Running against devdb: `MCP_URL=https://localhost:3000/api/mcp ./agents/id-mapping/claude-runner.sh`
- Configuration: `BATCH_SIZE` env var (default 50)
- Multiple agents: use different offset ranges (future, not automated yet)
- Monitoring: check `get_mapping_stats` for progress

## Key Patterns from the PRD to Encode in Prompt

- Wikidata SPARQL batch size ~50-100 Spotify IDs per VALUES clause
- Wikidata property codes: P1902 (Spotify), P2722 (Deezer), P2850 (Apple Music), P434 (MusicBrainz)
- MusicBrainz 1 req/sec rate limit is non-negotiable
- Deezer search is auth-free, ~50 req/5s
- Confidence levels: manual > high > medium > low
- Valid sources: wikidata, musicbrainz, name_search, manual
- Opportunistic saves: if Wikidata returns Apple Music ID too, save it even though we're targeting Deezer
- Multi-value edge case: verify each Deezer candidate via API, pick by fan count
- MusicBrainz Tier 2 partial hits (MBID found but no Deezer link) strengthen Tier 3 confidence

## Verification

1. Provision an MCP API key via admin UI (or reuse existing active key)
2. Start local dev server: `npm run dev`
3. Run the agent against devdb with a small batch:
   ```bash
   MCP_URL=https://localhost:3000/api/mcp \
   MCP_API_KEY=<key> \
   BATCH_SIZE=5 \
   ./agents/id-mapping/claude-runner.sh
   ```
4. Verify:
   - Agent calls `get_mapping_stats` at start and end
   - Agent calls `get_unmapped_artists("deezer", limit=5)`
   - Agent attempts Tier 1 (Wikidata SPARQL) for the batch
   - Agent falls through to Tier 2/3 for misses
   - Agent calls `resolve_artist_id` with correct confidence/source/reasoning
   - Mappings appear in `get_artist_mappings` for resolved artists
   - Session report is printed at end
5. Clean up: the test mappings in devdb are harmless (no DELETE policy), leave them
