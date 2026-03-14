#!/usr/bin/env bash
set -euo pipefail

# Quick progress checker — run from any SSH session.
# No need to reattach tmux.

LOG_DIR="${LOG_DIR:-/var/log/id-mapping}"

if [[ ! -d "$LOG_DIR" ]]; then
  echo "No log directory found at $LOG_DIR"
  exit 1
fi

total_runs=$(find "$LOG_DIR" -name 'run-*.log' -type f | wc -l | tr -d ' ')
successful_runs=$(grep -rl '=== ID Mapping Session Report ===' "$LOG_DIR" 2>/dev/null | wc -l | tr -d ' ')
failed_runs=$((total_runs - successful_runs))

echo "========================================"
echo " ID Mapping — Progress Report"
echo "========================================"
echo " Log dir:         $LOG_DIR"
echo " Total runs:      $total_runs"
echo " Successful:      $successful_runs"
echo " Failed:          $failed_runs"
echo ""

# Sum resolved across all runs
if [[ $successful_runs -gt 0 ]]; then
  total_resolved=$(grep -roh 'Resolved: [0-9]*' "$LOG_DIR" 2>/dev/null | awk -F': ' '{s+=$2} END {print s+0}')
  total_conflicts=$(grep -roh 'Conflicts: [0-9]*' "$LOG_DIR" 2>/dev/null | awk -F': ' '{s+=$2} END {print s+0}')
  total_errors=$(grep -roh 'Errors: [0-9]*' "$LOG_DIR" 2>/dev/null | awk -F': ' '{s+=$2} END {print s+0}')
  total_skipped=$(grep -roh 'Skipped: [0-9]*' "$LOG_DIR" 2>/dev/null | awk -F': ' '{s+=$2} END {print s+0}')

  echo " Total resolved:  $total_resolved"
  echo " Total conflicts: $total_conflicts"
  echo " Total errors:    $total_errors"
  echo " Total skipped:   $total_skipped"
  echo ""

  # Estimate completion
  if [[ $total_resolved -gt 0 && $successful_runs -gt 0 ]]; then
    rate=$(echo "$total_resolved / $successful_runs" | bc -l 2>/dev/null | xargs printf "%.1f" 2>/dev/null || echo "?")
    echo " Avg resolved/run: $rate"

    # Try to find remaining count from last successful run
    last_log=$(grep -rl '=== ID Mapping Session Report ===' "$LOG_DIR" 2>/dev/null | sort | tail -1)
    if [[ -n "$last_log" ]]; then
      remaining=$(grep -oE 'totalUnmapped.*?[0-9]+' "$last_log" 2>/dev/null | grep -oE '[0-9]+' | tail -1 || true)
      if [[ -n "$remaining" && "$remaining" -gt 0 && "$rate" != "?" ]]; then
        runs_left=$(echo "$remaining / $rate" | bc -l 2>/dev/null | xargs printf "%.0f" 2>/dev/null || echo "?")
        echo " Remaining:        ~$remaining artists"
        echo " Est. runs left:   ~$runs_left"
      fi
    fi
  fi
fi

echo ""

# Last run details
last_log=$(find "$LOG_DIR" -name 'run-*.log' -type f | sort | tail -1)
if [[ -n "$last_log" ]]; then
  echo "--- Last Run: $(basename "$last_log") ---"

  # Show session report if present
  if grep -q '=== ID Mapping Session Report ===' "$last_log" 2>/dev/null; then
    sed -n '/=== ID Mapping Session Report ===/,/===/p' "$last_log" | head -30
  else
    echo "(no session report — run may have failed)"
    tail -5 "$last_log"
  fi
fi

echo "========================================"
