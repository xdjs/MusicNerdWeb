#!/bin/bash
set -e

INPUT=$(cat)

# Extract path fields — different tools use different parameter names:
#   Write/Edit/Read: file_path
#   Glob: path (optional, defaults to cwd)
#   Grep: path (optional, defaults to cwd)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')

# Auto-approve operations within the project and any worktrees (MusicNerdWeb*)
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

# For Glob/Grep with no path (defaults to cwd), allow if cwd is within project
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
if [[ "$TOOL_NAME" =~ ^(Glob|Grep)$ ]] && [[ -z "$FILE_PATH" ]]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Glob/Grep with default path in project"
  }
}
EOF
  exit 0
fi

# Everything else falls through to normal prompting
exit 0
