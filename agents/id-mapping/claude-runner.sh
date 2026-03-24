#!/usr/bin/env bash
set -euo pipefail

# Required env vars
: "${MCP_API_KEY:?Set MCP_API_KEY to your MusicNerd MCP API key}"

# Optional config
MCP_URL="${MCP_URL:-https://musicnerd.xyz/api/mcp}"
BATCH_SIZE="${BATCH_SIZE:-50}"
VERBOSE="${VERBOSE:-0}"

# Generate MCP config with env vars substituted
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE=$(mktemp)
trap 'rm -f "$CONFIG_FILE"' EXIT

export MCP_API_KEY MCP_URL
envsubst < "$SCRIPT_DIR/mcp-config.json" > "$CONFIG_FILE"

# Read the system prompt from file
SYSTEM_PROMPT="$(cat "$SCRIPT_DIR/prompt.md")"

# Build claude CLI args — always use stream-json for real-time output
CLAUDE_ARGS=(
  --system-prompt "$SYSTEM_PROMPT"
  --mcp-config "$CONFIG_FILE"
  --allowedTools "mcp__music-nerd__*,WebFetch,WebSearch,Bash"
  --output-format stream-json
  --verbose
  -p
)

if [[ "$VERBOSE" == "1" ]]; then
  echo "[claude-runner] $(date -u '+%H:%M:%S') Starting claude CLI (VERBOSE)..."
  echo "[claude-runner] MCP URL: $MCP_URL"
  echo "[claude-runner] Batch size: $BATCH_SIZE"
  echo "[claude-runner] Config: $(cat "$CONFIG_FILE" | sed 's/Bearer [^"]*/Bearer ***/')"
  echo ""
else
  echo "[claude-runner] $(date -u '+%H:%M:%S') Starting batch (size=$BATCH_SIZE)..."
fi

# Stream filter: extract assistant text content in real-time
# VERBOSE=1: raw stream-json (every event)
# Default: only assistant text + errors + final result
stream_filter() {
  if [[ "$VERBOSE" == "1" ]]; then
    cat
  else
    python3 -u -c '
import sys, json, time
from datetime import datetime, timezone

start = time.monotonic()

def ts():
    return datetime.now(timezone.utc).strftime("%H:%M:%S")

def stamp(text):
    """Prepend timestamp to first line, indent continuation lines."""
    lines = text.rstrip("\n").split("\n")
    out = f"[{ts()}] {lines[0]}"
    for l in lines[1:]:
        out += f"\n         {l}"
    return out

for line in sys.stdin:
    line = line.strip()
    if not line or not line.startswith("{"):
        if line:
            print(stamp(line), flush=True)
        continue
    try:
        obj = json.loads(line)
        t = obj.get("type")
        if t == "assistant":
            for block in obj.get("message", {}).get("content", []):
                if block.get("type") == "text" and block.get("text"):
                    print(stamp(block["text"]), flush=True)
        elif t == "result":
            elapsed = time.monotonic() - start
            mins, secs = divmod(int(elapsed), 60)
            dur_ms = obj.get("duration_ms", 0)
            api_ms = obj.get("duration_api_ms", 0)
            turns = obj.get("num_turns", 0)
            print(f"\n[{ts()}] Batch complete: {mins}m{secs:02d}s wall, {dur_ms/1000:.0f}s claude, {api_ms/1000:.0f}s api, {turns} turns", flush=True)
    except (json.JSONDecodeError, KeyError):
        pass
'
  fi
}

# Run the agent (echo provides stdin to prevent hang in non-TTY contexts)
echo "" | claude "${CLAUDE_ARGS[@]}" \
  "Resolve Deezer IDs for unmapped artists. Batch size: ${BATCH_SIZE}." \
  2>&1 | stream_filter

exit_code=${PIPESTATUS[0]}
echo ""
echo "[claude-runner] $(date -u '+%H:%M:%S') Claude CLI exited with code $exit_code"
exit $exit_code
