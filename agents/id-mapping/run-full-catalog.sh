#!/usr/bin/env bash
set -euo pipefail

# Durable loop runner for processing the full artist catalog.
# Each iteration invokes claude-runner.sh (one batch), logs output,
# and stops after 3 consecutive failures.
#
# Usage:
#   tmux new -s id-mapping
#   ./agents/id-mapping/run-full-catalog.sh
#   # Ctrl-b d to detach

# Required
: "${MCP_API_KEY:?Set MCP_API_KEY to your MusicNerd MCP API key}"
: "${MCP_URL:?Set MCP_URL to the MCP server endpoint}"

# Optional config
BATCH_SIZE="${BATCH_SIZE:-50}"
MAX_ITERATIONS="${MAX_ITERATIONS:-800}"
LOG_DIR="${LOG_DIR:-/var/log/id-mapping}"
SLEEP_BETWEEN="${SLEEP_BETWEEN:-10}"
BATCH_TIMEOUT="${BATCH_TIMEOUT:-600}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER="$SCRIPT_DIR/claude-runner.sh"

mkdir -p "$LOG_DIR"

consecutive_failures=0
completed_runs=0
stop_reason=""

echo "========================================"
echo " ID Mapping — Full Catalog Run"
echo "========================================"
echo " Max iterations: $MAX_ITERATIONS"
echo " Batch size:     $BATCH_SIZE"
echo " Batch timeout:  ${BATCH_TIMEOUT}s"
echo " Sleep between:  ${SLEEP_BETWEEN}s"
echo " Log dir:        $LOG_DIR"
echo " MCP URL:        $MCP_URL"
echo " Started:        $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
echo ""

for i in $(seq 1 "$MAX_ITERATIONS"); do
  timestamp=$(date -u '+%Y%m%d-%H%M%S')
  run_num=$(printf "%04d" "$i")
  logfile="$LOG_DIR/run-${run_num}-${timestamp}.log"

  completed_runs=$i
  echo "--- Run $run_num / $MAX_ITERATIONS  [$timestamp] ---"

  # Run the batch with a timeout, capturing output
  set +e
  timeout "$BATCH_TIMEOUT" bash "$RUNNER" 2>&1 | tee "$logfile"
  exit_code=${PIPESTATUS[0]}
  set -e

  # Failure detection
  failed=false
  fail_reason=""

  if [[ $exit_code -eq 124 ]]; then
    failed=true
    fail_reason="timeout (exceeded ${BATCH_TIMEOUT}s)"
  elif [[ $exit_code -ne 0 ]]; then
    failed=true
    fail_reason="non-zero exit code ($exit_code)"
  elif ! grep -q '=== ID Mapping Session Report ===' "$logfile" 2>/dev/null; then
    failed=true
    fail_reason="no session report in output (agent didn't complete workflow)"
  fi

  if $failed; then
    consecutive_failures=$((consecutive_failures + 1))
    echo "*** FAILED: $fail_reason (consecutive: $consecutive_failures/3) ***"

    if [[ $consecutive_failures -ge 3 ]]; then
      stop_reason="3 consecutive failures — likely systemic issue (auth expired? endpoint down?)"
      break
    fi

    echo "Sleeping 30s before retry..."
    sleep 30
    continue
  fi

  # Success
  consecutive_failures=0

  # Check if all artists are mapped
  if grep -q '"totalUnmapped":.*0\b' "$logfile" 2>/dev/null || \
     grep -q 'totalUnmapped.*: 0\b' "$logfile" 2>/dev/null; then
    stop_reason="all artists mapped"
    break
  fi

  # Check if batch returned 0 artists (nothing left to process)
  if grep -qE '(No unmapped artists|unmapped.*found: 0|Batch size: 0)' "$logfile" 2>/dev/null; then
    stop_reason="no unmapped artists remaining"
    break
  fi

  echo "Sleeping ${SLEEP_BETWEEN}s..."
  sleep "$SLEEP_BETWEEN"
done

echo ""
echo "========================================"
echo " Run Complete"
echo "========================================"
echo " Finished:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
if [[ -n "$stop_reason" ]]; then
  echo " Reason:    $stop_reason"
elif [[ $completed_runs -ge $MAX_ITERATIONS ]]; then
  echo " Reason:    reached max iterations ($MAX_ITERATIONS)"
fi
echo " Total runs: $completed_runs"
echo " Log dir:    $LOG_DIR"
echo "========================================"
