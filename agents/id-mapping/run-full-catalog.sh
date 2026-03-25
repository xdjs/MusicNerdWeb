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
WORKER_ID="${WORKER_ID:-$$}"
RATE_LIMIT_BACKOFF="${RATE_LIMIT_BACKOFF:-300}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUNNER="$SCRIPT_DIR/claude-runner.sh"

mkdir -p "$LOG_DIR"

# Runner log — captures loop-level events (failures, restarts, stop reason)
# separate from per-batch logs so you can see the full history in one place
RUNNER_LOG="$LOG_DIR/${WORKER_ID}-runner.log"

log() {
  local msg="[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"
  echo "$msg"
  echo "$msg" >> "$RUNNER_LOG"
}

consecutive_failures=0
completed_runs=0
stop_reason=""

cleanup() {
  echo ""
  log "Interrupted — killing child processes..."
  kill 0 2>/dev/null
  exit 130
}
trap cleanup INT TERM

log "========================================"
log " ID Mapping — Full Catalog Run"
log "========================================"
log " Max iterations: $MAX_ITERATIONS"
log " Batch size:     $BATCH_SIZE"
log " Batch timeout:  ${BATCH_TIMEOUT}s"
log " Sleep between:  ${SLEEP_BETWEEN}s"
log " Rate backoff:   ${RATE_LIMIT_BACKOFF}s"
log " Log dir:        $LOG_DIR"
log " Worker ID:      $WORKER_ID"
log " MCP URL:        $MCP_URL"
log " Model:          ${MODEL:-sonnet}"
log " Started:        $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log "========================================"
echo ""

# Classify failure from exit code and log content.
# Sets fail_reason and fail_category (transient, rate_limit, auth, fatal).
classify_failure() {
  local exit_code="$1"
  local logfile="$2"

  fail_reason=""
  fail_category="transient"

  # Exit code classification
  if [[ $exit_code -eq 124 ]]; then
    fail_reason="timeout (exceeded ${BATCH_TIMEOUT}s)"
    fail_category="transient"
    return
  fi

  if [[ $exit_code -eq 137 ]]; then
    fail_reason="killed by signal (SIGKILL — possible OOM)"
    fail_category="fatal"
    return
  fi

  if [[ $exit_code -eq 130 ]]; then
    fail_reason="interrupted (SIGINT)"
    fail_category="fatal"
    return
  fi

  # Log content classification — check for known error patterns
  local log_tail
  log_tail=$(tail -50 "$logfile" 2>/dev/null || echo "")

  # Rate limit / usage limit
  # Note: [^0-9a-z] after status code prevents matching timing values like "429s claude"
  if echo "$log_tail" | grep -qiE '(rate.limit|too many requests|[^0-9]429[^0-9a-z]|usage.limit|quota|capacity|overloaded)'; then
    local matched
    matched=$(echo "$log_tail" | grep -oiE '(rate.limit|too many requests|[^0-9]429[^0-9a-z]|usage.limit|quota|capacity|overloaded)' | head -1)
    fail_reason="rate/usage limit (exit $exit_code, pattern: '$matched')"
    fail_category="rate_limit"
    return
  fi

  # Auth errors — match 401 only as HTTP status (not timing values like "401s" or counts like "38,401")
  if echo "$log_tail" | grep -qiE '(auth.*expir|token.*expir|unauthorized|[^0-9,]401[^0-9a-z]|invalid.*api.key|auth.*fail)'; then
    local matched
    matched=$(echo "$log_tail" | grep -oiE '(auth.*expir|token.*expir|unauthorized|[^0-9,]401[^0-9a-z]|invalid.*api.key|auth.*fail)' | head -1)
    fail_reason="auth error (exit $exit_code, pattern: '$matched')"
    fail_category="auth"
    return
  fi

  # Context / token limit
  if echo "$log_tail" | grep -qiE '(context.*length|token.*limit|max.*tokens|context.*window|too.long)'; then
    local matched
    matched=$(echo "$log_tail" | grep -oiE '(context.*length|token.*limit|max.*tokens|context.*window|too.long)' | head -1)
    fail_reason="context/token limit (exit $exit_code, pattern: '$matched')"
    fail_category="transient"
    return
  fi

  # Network errors
  if echo "$log_tail" | grep -qiE '(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network.*error|connection.*reset|socket.*hang)'; then
    local matched
    matched=$(echo "$log_tail" | grep -oiE '(ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network.*error|connection.*reset|socket.*hang)' | head -1)
    fail_reason="network error (exit $exit_code, pattern: '$matched')"
    fail_category="transient"
    return
  fi

  # No session report (agent started but didn't finish)
  if [[ $exit_code -eq 0 ]] && ! grep -q '=== ID Mapping Session Report ===' "$logfile" 2>/dev/null; then
    fail_reason="no session report in output (agent didn't complete workflow)"
    fail_category="transient"
    return
  fi

  # Generic non-zero exit
  if [[ $exit_code -ne 0 ]]; then
    # Capture last few lines for context
    local last_lines
    last_lines=$(tail -3 "$logfile" 2>/dev/null | tr '\n' ' ' | cut -c1-200)
    fail_reason="non-zero exit code ($exit_code) — last output: $last_lines"
    fail_category="transient"
    return
  fi
}

for i in $(seq 1 "$MAX_ITERATIONS"); do
  timestamp=$(date -u '+%Y%m%d-%H%M%S')
  run_num=$(printf "%04d" "$i")
  logfile="$LOG_DIR/${WORKER_ID}-run-${run_num}-${timestamp}.log"

  completed_runs=$i
  echo "--- [$WORKER_ID] Run $run_num / $MAX_ITERATIONS  [$timestamp] ---"
  echo "[loop] Logfile: $logfile"
  echo "[loop] Launching claude-runner.sh (timeout: ${BATCH_TIMEOUT}s)..."

  # Run the batch with a timeout, capturing output
  # Use stdbuf to disable buffering so tee gets output in real-time
  set +e
  stdbuf -oL timeout "$BATCH_TIMEOUT" bash "$RUNNER" 2>&1 | tee "$logfile"
  exit_code=${PIPESTATUS[0]}
  set -e

  logsize=$(stat --printf="%s" "$logfile" 2>/dev/null || stat -f%z "$logfile" 2>/dev/null || echo "?")
  echo "[loop] Claude exited with code $exit_code, log size: ${logsize} bytes"

  # Classify the failure
  classify_failure "$exit_code" "$logfile"

  # Check for success
  if [[ -z "$fail_reason" ]] && grep -q '=== ID Mapping Session Report ===' "$logfile" 2>/dev/null; then
    # Success
    consecutive_failures=0

    # Check if all artists are mapped
    if grep -q '"totalUnmapped":.*0\b' "$logfile" 2>/dev/null || \
       grep -q 'totalUnmapped.*: 0\b' "$logfile" 2>/dev/null; then
      stop_reason="all artists mapped"
      log "STOP: $stop_reason"
      break
    fi

    # Check if batch returned 0 artists (nothing left to process)
    if grep -qE '(No unmapped artists|unmapped.*found: 0|Batch size: 0)' "$logfile" 2>/dev/null; then
      stop_reason="no unmapped artists remaining"
      log "STOP: $stop_reason"
      break
    fi

    echo "Sleeping ${SLEEP_BETWEEN}s..."
    sleep "$SLEEP_BETWEEN"
    continue
  fi

  # Handle failure
  consecutive_failures=$((consecutive_failures + 1))
  log "FAILED run $run_num: $fail_reason [category=$fail_category, consecutive=$consecutive_failures/3]"

  # Fatal errors — stop immediately
  if [[ "$fail_category" == "fatal" ]]; then
    stop_reason="fatal error: $fail_reason"
    log "STOP: $stop_reason"
    break
  fi

  # Auth errors — stop immediately (manual intervention needed)
  if [[ "$fail_category" == "auth" ]]; then
    stop_reason="auth error: $fail_reason — run 'claude login' to re-authenticate"
    log "STOP: $stop_reason"
    break
  fi

  # 5 consecutive failures — stop
  if [[ $consecutive_failures -ge 5 ]]; then
    stop_reason="5 consecutive failures — last: $fail_reason"
    log "STOP: $stop_reason"
    break
  fi

  # Rate limit — longer backoff
  if [[ "$fail_category" == "rate_limit" ]]; then
    log "Rate limited — backing off ${RATE_LIMIT_BACKOFF}s..."
    sleep "$RATE_LIMIT_BACKOFF"
    continue
  fi

  # Transient failure — standard retry
  log "Retrying in 30s..."
  sleep 30
done

log "========================================"
log " Run Complete"
log "========================================"
log " Finished:  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
if [[ -n "$stop_reason" ]]; then
  log " Reason:    $stop_reason"
elif [[ $completed_runs -ge $MAX_ITERATIONS ]]; then
  log " Reason:    reached max iterations ($MAX_ITERATIONS)"
fi
log " Total runs: $completed_runs"
log " Log dir:    $LOG_DIR"
log "========================================"
