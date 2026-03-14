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
trap 'rm -f "$CONFIG_FILE"' EXIT

export MCP_API_KEY MCP_URL
envsubst < "$SCRIPT_DIR/mcp-config.json" > "$CONFIG_FILE"

# Read the system prompt from file
SYSTEM_PROMPT="$(cat "$SCRIPT_DIR/prompt.md")"

# Debug logging
echo "[claude-runner] $(date -u '+%H:%M:%S') Starting claude CLI..."
echo "[claude-runner] MCP URL: $MCP_URL"
echo "[claude-runner] Batch size: $BATCH_SIZE"
echo "[claude-runner] Config: $(cat "$CONFIG_FILE" | sed 's/Bearer [^"]*/Bearer ***/')"
echo ""

# Run the agent with streaming JSON output for real-time visibility
# --output-format stream-json emits one JSON event per line as the agent works
echo "" | claude \
  --system-prompt "$SYSTEM_PROMPT" \
  --mcp-config "$CONFIG_FILE" \
  --allowedTools "mcp__music-nerd__*,WebFetch,Bash" \
  --output-format stream-json \
  --verbose \
  -p \
  "Resolve Deezer IDs for unmapped artists. Batch size: ${BATCH_SIZE}." \
  2>&1

echo ""
echo "[claude-runner] $(date -u '+%H:%M:%S') Claude CLI exited with code $?"
