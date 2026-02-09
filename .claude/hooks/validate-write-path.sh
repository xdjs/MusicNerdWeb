#!/bin/bash
set -e

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Auto-approve writes within the project and any worktrees (MusicNerdWeb*)
if [[ "$FILE_PATH" =~ ^/Users/clt/src/xdjs/MusicNerdWeb ]]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Path is within MusicNerdWeb project boundary"
  }
}
EOF
  exit 0
fi

# Everything else falls through to normal prompting
exit 0
