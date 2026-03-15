#!/usr/bin/env bash
set -euo pipefail

# Launch id-mapping workers in detached tmux sessions.
#
# Usage:
#   ./agents/id-mapping/start-workers.sh ~/.env.mapping
#   ./agents/id-mapping/start-workers.sh ~/.env.mapping -n 2
#   ./agents/id-mapping/start-workers.sh ~/.env.mapping -n 2 -s mapping

usage() {
  echo "Usage: $0 <env-file> [-n workers] [-s session-prefix]"
  echo ""
  echo "  env-file          File to source for MCP_API_KEY, MCP_URL, etc."
  echo "  -n workers        Number of parallel workers (default: 1)"
  echo "  -s session-prefix tmux session name prefix (default: id-mapping)"
  echo ""
  echo "Example:"
  echo "  $0 ~/.env.mapping -n 2 -s mapping"
  echo "  # Creates tmux sessions: mapping-w1, mapping-w2"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

ENV_FILE="$1"
shift

NUM_WORKERS=1
SESSION_PREFIX="id-mapping"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -n) NUM_WORKERS="$2"; shift 2 ;;
    -s) SESSION_PREFIX="$2"; shift 2 ;;
    *)  echo "Unknown option: $1"; usage ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: $ENV_FILE"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER="$SCRIPT_DIR/run-full-catalog.sh"

if [[ ! -x "$RUNNER" ]]; then
  echo "Error: run-full-catalog.sh not found or not executable at $RUNNER"
  exit 1
fi

# Check for existing sessions
for w in $(seq 1 "$NUM_WORKERS"); do
  session="${SESSION_PREFIX}-w${w}"
  if tmux has-session -t "$session" 2>/dev/null; then
    echo "Error: tmux session '$session' already exists. Kill it first:"
    echo "  tmux kill-session -t $session"
    exit 1
  fi
done

echo "Launching $NUM_WORKERS worker(s)..."
echo ""

for w in $(seq 1 "$NUM_WORKERS"); do
  session="${SESSION_PREFIX}-w${w}"
  tmux new-session -d -s "$session" "source $ENV_FILE && $RUNNER; echo '[worker exited with code \$?]'; exec bash"
  # remain-on-exit keeps the pane visible if the script crashes
  tmux set-option -t "$session" remain-on-exit on
  echo "  Started: $session (tmux attach -t $session)"

  # Stagger starts to reduce initial overlap
  if [[ $w -lt $NUM_WORKERS ]]; then
    sleep 5
  fi
done

echo ""
echo "Monitor:"
echo "  tmux ls"
echo "  $SCRIPT_DIR/check-status.sh"
echo "  tmux attach -t ${SESSION_PREFIX}-w1"
