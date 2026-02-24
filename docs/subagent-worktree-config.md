# Sub-Agent Worktree Configuration

Enable Claude Code sub-agents (via the `Task` tool with `general-purpose` type) to autonomously read, write, and execute commands in git worktrees with minimal permission prompts.

## 1. Bash Allow Patterns

In `.claude/settings.json`, worktree commands use a **least-privilege** approach — only specific CI commands are auto-approved:

```json
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb*)",
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb* && npm run type-check)",
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb* && npm run lint)",
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb* && npm run test)",
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb* && npm run build)",
"Bash(cd /Users/clt/src/xdjs/MusicNerdWeb* && npx jest *)"
```

The first pattern allows `cd` into any worktree. The remaining patterns allow specific chained commands. Any other chained command (e.g., `cd /worktree && npm run dev`) will prompt for approval.

**Key insight**: cwd does NOT persist between Bash calls in sub-agents, so every command must be prefixed with `cd /path/to/worktree && `.

Git commands use specific subcommands rather than a broad `git *` wildcard:

```json
"Bash(git status *)",
"Bash(git diff *)",
"Bash(git log *)",
"Bash(git add *)",
"Bash(git commit *)",
"Bash(git checkout -b *)",
"Bash(git branch *)",
"Bash(git worktree *)",
"Bash(git push *)",
"Bash(git fetch *)",
"Bash(git show *)",
"Bash(git ls-tree *)",
"Bash(git stash *)",
"Bash(git -C *)"
```

Destructive git operations like `git checkout .`, `git rebase`, and `git merge` require manual approval.

**Removed for security**: `node -e *` (arbitrary code execution), `curl *` (arbitrary network access), `mcp__proddb__*` (unguarded production DB operations).

## 2. Deny Patterns Must Duplicate with `cd` Prefix

```json
"deny": [
  "Bash(git push --force *)",
  "Bash(cd * && git push --force *)",
  "Bash(git reset --hard *)",
  "Bash(cd * && git reset --hard *)",
  "Bash(rm -rf *)",
  "Bash(cd * && rm -rf *)"
]
```

Deny takes precedence over allow. Without the `cd * &&` variants, a sub-agent could bypass deny rules by prefixing dangerous commands with `cd /worktree &&`.

## 3. PreToolUse Hook for File Operations

**Matcher** (in `.claude/settings.json`): `Write|Edit|Read|Glob|Grep`

**Hook script** (`.claude/hooks/validate-write-path.sh`): Auto-approves any tool call where the path falls within the project boundary.

- **Write/Edit/Read**: Checks `tool_input.file_path`
- **Glob/Grep**: Checks `tool_input.path`, and also allows calls with no explicit path (defaults to cwd, which is within the project)

```bash
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty')
if [[ "$FILE_PATH" =~ ^/Users/clt/src/xdjs/MusicNerdWeb ]]; then
  # auto-approve
fi
```

No new security implications — Read/Glob/Grep are read-only operations.

## 4. Worktree Setup Requirements

Each worktree needs symlinks to the main repo's shared resources:

```bash
ln -s /main/node_modules /worktree/node_modules
ln -s /main/.env.local /worktree/.env.local
```

## 5. Agent Prompt Pattern

When dispatching a sub-agent, include:

> "Your working directory is `/path/to/worktree`. Prefix every Bash command with `cd /path/to/worktree && `."

Use `general-purpose` subagent type (not `Bash`) since it has access to Write/Edit/Read tools.

## 6. Port Isolation for Parallel Agents

When running multiple agents that each need a dev server, assign different ports (3001, 3002, etc.) via the `webServer` block in each worktree's `playwright.config.ts`. Requires adding `localhost:300X` to the Privy dashboard's allowed origins.

## Known Limitation

**Session-cached Bash denials**: If a sub-agent's Bash call is denied by the user once, that denial is cached for all subsequent sub-agents in the same session. The only fix is to restart the Claude session.
