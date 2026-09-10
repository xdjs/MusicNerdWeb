# MusicNerdWeb — Agent Guide

Canonical instructions for every coding assistant; `AGENTS.md` only points here.

New engineers start with the [documentation map](docs/README.md). Historical plans and meeting
notes preserve their original context; they do not override this guide or authorize old tasks.

## Product and orientation

Music Nerd is an artist directory that deepens listeners' relationships with artists through
links, source-backed profiles, social research, and artists' own interview answers.
Next.js 15 App Router, TypeScript, Drizzle/Postgres (Supabase), Privy + NextAuth, Tailwind/Radix.

Read `MEMORY.md` for the engineering handoff and the task's relevant entry in
[decisions](docs/rnd/decisions.md). Verify worktree, branch, remote heads and PR state rather than
treating a handoff as live evidence. Preserve user edits and ignored files.

| Area | Entry point |
| --- | --- |
| Artist UI and Latest cards | `src/app/artist/[id]/` |
| Routes / actions / business queries | `src/app/api/`, `src/app/actions/`, `src/server/utils/queries/` |
| Data model / client / types | `src/server/db/schema.ts`, `drizzle.ts`, `DbTypes.ts` |
| Authentication and authorization | `src/server/auth.ts`, `src/lib/auth-helpers.ts` |
| Research workers and scheduler | `src/server/utils/researchRunner.ts`, `src/app/api/research/advance/` |
| MCP tools and shared link writes | `src/app/api/mcp/`, `src/server/utils/artistLinkService.ts` |

[Development reference](docs/development.md) covers setup, test patterns, integrations, and
migration/release verification. Load only the deeper guidance relevant to the change.

## Critical boundaries

- The app database role is `mnweb`, not the owner. Verify grants **and** RLS policies as/for that
  role. Role-wide policies are not user isolation; authenticate and authorize every mutation in
  application code. Never infer working app access from a successful owner SQL query.
- Interview `sitting` and `offered_at` are fixed at offer time. Answer upserts re-stamp
  `created_at`; don't use it to reconstruct offers. Preserve artists' words and real source URLs.
- Durable research belongs in existing jobs, not detached work inside a request. Reading an
  artist page must not introduce scraping, generation, or new writes.
- Keep server credentials and raw research payloads out of client props/logs. Use `@/env` for
  server configuration. Don't broaden permissions or work around release approvals.
- Development has an admin-session fallback. A dev UI pass does not prove production login or
  anonymous authorization. Tests mock many integrations; state that limitation.

## Implement and verify

One owner integrates and closes the task. Define completion as something a user can observe.
Trace the changed path through UI, route/action, persistence, jobs and external services, marking
non-applicable layers explicitly. Reuse existing mechanisms before adding new infrastructure.

Delegate only independent, bounded work when it reduces total effort; no recursive delegation
or review ping-pong. Match plan, tests and review to risk. Read failure evidence before retrying;
repeated identical failures require root-cause investigation, not another blind run.

Use npm (versions in `package.json`; CI configuration in `.github/workflows/ci.yml`).
Match surrounding style, use `@/` imports, keep components server-side unless interactivity
requires a client component, and await Next.js route params.

Run focused regression tests while editing. Before a code PR, run `npm run ci`
(TypeScript, lint, Jest with coverage, production build). Setup and no-secret
build instructions are in [development](docs/development.md#verification).
For UI/integration changes, exercise the actual entry point and relevant flow as well:
mock-only tests aren't end-to-end evidence. Apply the relevant checks from the
[regression checklist](docs/rnd/pre-push-checklist.md).
Never remove coverage/checks just to make a failure green.

Report what passed, failed, or remained unverified; separate blockers from optional improvements.
Stop once agreed scope is implemented and sufficiently verified.

## Git, documentation and releases

Feature branch off `staging` → PR to `staging` → release PR from `staging` to `main`.
Use `username/feature-name`, conventional commits, and stage only intended named files.
Docs follow the same route. **Do not merge or deploy without authorization.** Release approval
remains reviewer green light → Pete tells Carl → Carl merges the release.

Schema SQL and the Drizzle journal are one change. Apply required migrations before dependent
code deploys; follow the [migration protocol](docs/development.md#database-migrations).
Do not trust automated migration replay until issue #1148 is reconciled.

Keep durable public docs tracked; secrets, raw transcripts and disposable captures stay ignored
per [R&D guidance](docs/rnd/README.md). `MEMORY.md` is the single engineering handoff, not a
diary or a second task tracker. Update it for material state/priority changes, link evidence,
and distinguish locally implemented from shipped. Don't create releases solely to move handoffs.

## Skills

Read the available relevant skill before using it: Next.js/React for UI and server boundaries;
Supabase/Postgres for database work; browser verification for UI flows; deployment/observability
for release diagnostics. Load task-specific references, not every installed skill. A tool or
skill recorded by another assistant may not exist here; translate to available equivalents.
Repository conventions live here, implementation/runbooks in linked docs, current state in
`MEMORY.md` — don't duplicate them into new agent-specific guides.
