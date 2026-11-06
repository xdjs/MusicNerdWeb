# Isolated real Next profile/setup acceptance

LOCAL SYNTHETIC TEST ONLY. None of these adapters are imported by production entrypoints. `create.mjs` copies tracked source into a new `/tmp/mn-1655-next-*` artifact and replaces that artifact's Next config. Because Next's TypeScript path resolution can precede webpack aliases, the copied server-auth/database/music entry modules explicitly re-export the isolated adapters too; original repository modules are untouched. It retains actual ArtistPage, layout, profile/setup components, navigation, server actions, query/persistence code and local assets. Unrelated page/API routes and tests are excluded. It does not copy environment files or install packages.

## Parent-owned services

- Actual API routes on 127.0.0.1:43165 with deterministic test-only identity/model/discovery boundaries.
- Native synthetic PostgreSQL, UNIX socket from `MN_1655_PG_SOCKET`, port 55465, database `mn_1655_synthetic`, app role `mnweb`, no password.
- Artist 00000000-0000-4000-8000-000000000001; claimant 00000000-0000-4000-8000-000000000002; subject `local-subject`; token `local-synthetic`.
- Approved claim, initial incomplete onboarding, synthetic Lore and necessary profile fixture tables.

Web runtime accepts no database URL; the adapter validates an exact `/tmp/mn-1655-pg.ALPHANUMERIC` or `/private/tmp/mn-1655-pg.ALPHANUMERIC` socket path; the runner also checks its canonical path, ownership and private directory permissions. `schema-fixture.json` describes the tracked Web columns for synthetic compatibility only. It is not a migration, production schema audit or authorization to add tables remotely.

## Local commands

```sh
node docs/testing/local-1655-next/schema-fixture.mjs
node docs/testing/local-1655-next/create.mjs
# Build the printed artifact with dummy Spotify values and the offline network-denial preload.
# Parent starts API/PostgreSQL, then supplies only its owned socket:
MN_1655_PG_SOCKET=/tmp/mn-1655-pg.EXAMPLE node docs/testing/local-1655-next/run.mjs /tmp/mn-1655-next-ARTIFACT
```

The runner owns Next on 43166 and a fresh Playwright Chromium context. Browser requests allow only Web 43166 / API 43165; Next runtime allows those ports plus the exact PostgreSQL socket and denies external DNS/TLS/fetch/sockets. No existing browser profile, shared database, real identity provider or paid generation is used.

## Actual vs adapted

Actual: Next server rendering, hydration, router.refresh, real profile page/layout/components, onboarding start/poll/progress UI, About request helper and hook, edit context, toast, Bios/history server actions, database query and persistence code.

Test-only adapters: server authentication and NextAuth client session return the same fictional claimant; Privy returns its fixed token/subject. This does not exercise real login/signature/session issuance. Music-platform portrait/provider reads return no image; analytics are inert. Exact Google favicon image GETs are fulfilled with a local synthetic SVG and counted separately; they never contact Google. All other non-loopback browser requests fail. Database adapter changes only the connection to the local fixture and reuses real createDatabase. No user-controlled request/header can activate these adapters in production.

Parent API fixtures replace external discovery/research/model and workflow hosting boundaries while retaining the actual setup handler/stages/persistence as specified by the parent test. Local workflow execution does not prove hosted durable scheduling/retry semantics. Peripheral navigation/API reads require synthetic responses or corresponding actual read routes and are recorded separately by that fixture.

## Intended assertions

Actual claimant page arrival starts setup; state becomes complete and research status disappears. The user edits the profile, regenerates About, saves a manual biography, pins the corresponding history version through real Next server actions, and reloads. The reloaded editor must show unchanged pinned manual text and remain locked. External requests and browser errors fail the runner.

Integrated acceptance passed on 2026-11-05: all 30 native PostgreSQL tests passed with both browser suites enabled, including this actual Next edit/pin/reload flow and its second setup-preservation pass. The ancillary Latest and discovery GET responses are explicitly required to return 200. API types and scoped lint passed; the isolated production Next artifact previously passed its offline build, lint and types. Evidence and reproducible invocation are in the paired API repository docs/review/1655-full-next-acceptance-2026-11-05.md.

For a synthetic-only diagnostic rerun, `MN_1655_NEXT_DEV_DIAGNOSTIC=yes` selects `next dev` using the same isolated adapters and egress guard. This is not production-build acceptance. Failed runs save only synthetic rendered body text and URL to `/tmp/mn1655-next-failure-PID.json`. Regeneration assertions wait for the actual PUT response and completion toast before subsequent edits.

The optional final runner argument `preserve` performs a second setup-arrival pass after the parent clears only onboarding progress. It requires the existing manual biography and pin to survive completion and reload, without clicking regenerate/save/pin. The parent independently checks stored Lore, source rows and provider counters.

The copied build sets `NEXT_PUBLIC_PRIVY_APP_ID=local-synthetic-app` so both server and browser render the real PrivyLogin branch through the synthetic adapter. Without this dummy setting, production SSR on loopback selects a different no-wallet Admin-link branch than the client, producing hydration errors; the harness does not suppress those errors. No real app ID or login is used.

Only 404 responses for Next router prefetch GETs (`next-router-prefetch: 1` and `_rsc`) to the intentionally omitted `/`, `/about`, `/terms` and `/privacy` pages are counted separately. Normal navigation errors, profile responses, API failures and all other HTTP errors still fail acceptance. These peripheral pages are not tested.
