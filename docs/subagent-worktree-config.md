# Worktrees and assistant configuration

The shared rules are in [CLAUDE.md](../CLAUDE.md). This page describes optional worktree setup,
not a requirement to use Claude Code, sub-agents or any particular permission configuration.

Use a separate worktree when independent work would otherwise disturb another task. Start its
feature branch from `staging`, follow the team's branch naming convention, and inspect existing
worktrees before creating one. Never reset, stash or switch someone else's working changes.

Each worktree needs its own compatible dependencies (`npm ci`) and `.next` output. Obtain dev
configuration through the secure team handoff; do not overwrite existing env files or assume
another checkout's credentials target dev. Keep credentials and local tool permissions ignored.

Set the working directory explicitly using the execution tool's cwd/workdir option. An earlier
shell `cd` may not persist into the next call. Paths are machine-specific; do not copy another
engineer's absolute path into shared settings.

Assign a separate port for each dev server, configure the matching auth origin, and target it
with `E2E_BASE_URL` when testing. See [development](development.md#verification). Do not run a
build alongside a dev server in the same worktree; both write `.next`.

Assistant tools, sandbox permissions and approval behavior differ by runtime. Use the active
runtime's supported settings. The previous Claude-specific allow/deny snippets and hook examples
were local configuration, not portable security guarantees or project authorization.
