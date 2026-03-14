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

# Run the agent (echo provides stdin to prevent hang in non-TTY contexts)
echo "" | claude \
  --system-prompt "$SYSTEM_PROMPT" \
  --mcp-config "$CONFIG_FILE" \
  --allowedTools "mcp__music-nerd__*" \
  -p \
  "Resolve Deezer IDs for unmapped artists. Batch size: ${BATCH_SIZE}."
