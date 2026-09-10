# Engineering docs — start here

For a new engineer and their coding assistants. Music Nerd is an artist directory that helps
listeners learn more about artists through links, sourced profiles and artists' own answers.

## First read

1. [Project overview](../README.md) — what the app does and how to start it.
2. [Agent guide](../CLAUDE.md) — the shared engineering rules. `AGENTS.md` points to this same
   guide; there is no separate set of rules for each assistant.
3. [Engineering handoff](../MEMORY.md) — dated work in progress, verification and release gates.
   Check your branch and the current remote state before treating its status as live.
4. [Development reference](development.md) — setup, architecture, tests and migrations.
5. [Product decisions](rnd/decisions.md) — why we are building it this way, with dated sources.

## First local session

- Ask Pete for repository access and the team's secure dev-credential handoff. Confirm the dev
  database and a suitable test account. Ask which issue and branch to start from; access details
  and credentials do not belong in these public docs.
- Follow [setup](development.md#setup), including npm/runtime versions and local HTTPS.
  There is no committed environment template. Real login also needs Privy configuration for
  the local origin; the development admin fallback does not verify that integration.
- Open the home page, search for an artist, then read the artist profile. Trace that page into
  its components and queries using the architecture map. Account profiles and artist profiles
  are separate concepts; a signed-in user can have an approved artist claim.
- Run a focused existing Jest test, then follow [verification](development.md#verification)
  for the checks relevant to the first change. Use a dev target for flows that write data.

Successful setup means the app loads real dev data and the relevant checks run. If a required
service or migration is missing, record that limitation rather than treating a stub or the dev
admin fallback as a completed integration check.

## Find the right reference

| Need | Read |
| --- | --- |
| App structure, auth, environment and testing | [Development](development.md) |
| HTTP route contracts and entry points | [API reference](../ApiReadMe.md) |
| Agent API access and tool authorization | [MCP reference](mcp.md) |
| Artist Latest | [Feature contract](artist-latest.md); release status in `MEMORY.md` |
| Account bookmarks | [Feature contract and migration](account-bookmarks.md); release status in `MEMORY.md` |
| Database changes | [Migration protocol](development.md#database-migrations) |
| Past regressions to check | [Regression checklist](rnd/pre-push-checklist.md) |
| Meetings and missing records | [Meeting index](rnd/meetings/README.md) |
| Research, agendas and public-note conventions | [R&D guide](rnd/README.md) |
| ID-mapping worker operations | [Worker README](../agents/id-mapping/README.md) |

## How to read older documents

The implementation and its tests describe behavior in the checkout. `CLAUDE.md` defines working
conventions, `development.md` explains them, and `MEMORY.md` records dated engineering state.
Deployment must be verified separately: a local implementation or merged PR is not evidence
that a feature works in production.

`plans/`, `docs/superpowers/`, files named `*-plan.md` or `*-prd.md`, and dated research, demos,
benchmarks and runbooks preserve context at the time they were written. Their checkboxes,
instructions and phrases such as “currently” are not a live task queue. Compare them with
the current implementation and handoff before acting. An agenda records intended discussion;
meeting notes record supported outcomes. A missing transcript is a gap, not permission to
invent a decision.

In particular, the old SIWE/wallet-first auth analysis and the several Privy migration drafts
are historical. Current auth uses Privy with NextAuth sessions. Old docs-only direct-to-main
permission is also historical; the current branch and release rules are in `CLAUDE.md`.

When a change settles a product question, update the decision index and link its evidence.
When it changes engineering state, update `MEMORY.md`. Put durable implementation detail in
the relevant reference rather than creating another handoff or agent-specific guide.
