# Development reference

Operating rules live in [CLAUDE.md](../CLAUDE.md); current work lives in
[MEMORY.md](../MEMORY.md). This is technical reference, not another task list.

## Setup

Use npm, not the historical Bun lockfile. `package.json` declares Node 24.x LTS and npm >=11.10.
The `.nvmrc` pins Node 24.21.0 for development and GitHub Actions; CI installs npm 11.12.1.
With nvm installed, select the project runtime before installing dependencies:

```bash
nvm install
nvm use
npm ci
```

Other version managers should select the version in `.nvmrc`. The `24.x` engine range also
selects Node 24 for Vercel deployments; Vercel manages the patch version. Keep `.nvmrc`,
`package.json`, and the Node type definitions aligned when upgrading the LTS major.

There is currently **no `.env.example`**. Obtain dev credentials through the team's secure
channel and create `.env.local` only if it doesn't exist. Never overwrite another user's env.
Read `src/env.ts` for the authoritative configuration and defaults.

| Configuration | Purpose |
| --- | --- |
| `SUPABASE_DB_CONNECTION` | Dev Postgres connection as `mnweb`; verify project and role before use |
| `NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID`, `NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET` | Existing catalog credentials; the public secret name is known debt, not a pattern to copy |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Session configuration; local URL is HTTPS when using `npm run dev` |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET` | Real Privy login |
| `OPENAI_API_KEY` | Legacy env validation only; a stub suffices. The declared OpenAI client is unused by current features |
| `GEMINI_API_KEY` | Research, interview generation, profile synthesis |
| `APIFY_API_TOKEN` | Instagram ingestion; absent means ingestion no-ops |
| `TAVILY_API_KEY`, `WEB_SEARCH_PROVIDER` | Optional profile-discovery web search |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Storage and its health checks; service key stays server-side |
| `CRON_SECRET` | Scheduled research advancement |
| `RESEND_API_KEY`, `DISCORD_WEBHOOK_URL` | Optional email and UGC notifications |

Other rate-limit and AI timeout/model settings are declared in their consumers.
Do not send production credentials to preview environments or log connection strings.

`npm run dev` serves HTTPS on port 3000; `npm run dev -- --port 3002` selects another port.
Trust the local certificate as needed. Don't run dev and build simultaneously in one worktree:
both write `.next`.

Several pages use `getDevSession()` when no real session exists. In development it may create
a `dev@localhost` admin user. Use a dev database; this fallback is not a login test.

## Architecture and integration map

- **Artist profile:** `src/app/artist/[id]/page.tsx` composes the hero, actions, About,
  links, interview and related sections. Its server components query existing data; client
  islands handle dialogs and interaction. The unreleased Latest experiment and its planned
  read path are in [artist-latest.md](artist-latest.md); that implementation remains local.
- **Queries:** server actions in `src/app/actions/` and handlers in `src/app/api/` delegate
  business logic to `src/server/utils/queries/`. Shared model types are in
  `src/server/db/DbTypes.ts`; Drizzle schema/client are beside them.
- **Artist search:** `searchForArtistByName` matches both spaced queries and their
  compact form against `artists.lcname`: older records can store `peterango` while
  newer records preserve spaces. Both count as substring matches before fuzzy ranking
  and the ten-result limit, so `pete ra` can return the existing Pete Rango profile.
  The combined search route then applies its existing external-result deduplication.
  This compatibility read changes no stored names, provider identities or artist records;
  the existing indexes and fuzzy fallback remain in use. Regression: issue #1256.
- **Auth:** `src/server/auth.ts` uses a Privy CredentialsProvider and NextAuth JWT sessions.
  `src/server/utils/privy.ts` verifies tokens. Privy login UI lives under
  `src/app/_components/nav/components/`. Legacy wallets can be linked with `mergeAccounts()`;
  inspect account-owned data whenever changing that path.
- **Authorization:** `src/lib/auth-helpers.ts` provides `requireAuth`, `requireAdmin`, and
  `requireWhitelistedOrAdmin`. Artist edits additionally require the existing ownership guard.
  Admin checks must use the live role, not only a stale session claim.
- **Shared logic layout:** `src/lib` is pure shared logic with no I/O. Files are grouped by
  domain once a domain has two or more of them (`src/lib/artist/`, `bio/`, `source/`,
  `inprocess/`); a domain with one file stays flat until a second joins it, and there are no
  barrel `index.ts` files. New modules export one function each, named after it, with the
  test beside the folder's other tests (`inprocess/` is the model). Older multi-export modules
  (`artist/artistLatest.ts`, `artist/artistProfileLinks.ts`, `source/sourceAuthority.ts`, the
  `bio/` files) predate that rule and keep their exports until they are next changed; split
  them then, not in a move. `src/server/utils` is server I/O under the same grouping rule
  (`musicPlatform/`, `queries/`, `onboarding/`). Import by `@/lib/<domain>/<module>`.
- **Source-backed research:** `socialIngest.ts` stores posts; `researchRunner.ts` advances
  `artist_research_jobs` through ingest/extraction slices, with persistence in
  `queries/researchJobQueries.ts`. `/api/research/advance` and the configured cron resume work.
  `questionGenerator.ts` uses stored sources; `queries/onboardingQueries.ts` saves offers/answers.
  Reuse this path; a request finishing is not evidence its background work finished.
- **Catalogs:** `src/server/utils/musicPlatform/` handles platform data.
  `cachedOrDirect` preserves function behavior outside Next cache context (e.g. CLIs), falling
  back only for a missing cache context, not for real provider failures.
- **MCP:** `src/app/api/mcp/` contains tool registration, HTTP transport, bearer-key auth,
  request context, audit and response transformers. Read tools and write tools have different
  authorization boundaries. Writes reuse `artistLinkService.ts` / `idMappingService.ts`.
  Use Admin → MCP Keys to create/revoke keys; secrets cannot be retrieved afterward.
  See the [MCP reference](mcp.md); [ID mapping](cross-platform-id-mapping.md) records the original
  algorithm design and should be compared with the current service before changing behavior.
- **Admin:** `src/app/admin/` owns UGC, Users, MCP Keys and Agent Work surfaces.
  User/artist/UGC relationships and mapping enums are defined in `schema.ts`; don't keep a
  second schema inventory in instructions.
- **Rate limiting:** `src/middleware.ts` applies configurable API limits (auth excluded).
  Storage is in-process: cold starts reset it and different workers don't share it.
- **Bookmarks:** the released implementation uses browser storage. The account-backed API,
  shared hook and profile panel are local feature work, absent from this docs release. See
  [account-bookmarks.md](account-bookmarks.md) for that proposed contract and migration gate.

## Coding and test patterns

Server Components are the default. Add `"use client"` for hooks, event handlers and browser
APIs. Server session reads use `getServerAuthSession()`; client session reads use `useSession()`.
Use `cn()` for conditional Tailwind classes and match the surrounding indentation.

Route params are promises in Next.js 15: await them. Export named HTTP handlers. Routes requiring
fresh request-time data must not accidentally become static. Keep secrets/raw payloads on the
server; send only needed view data across the server/client boundary.

Jest 30 uses JSDOM and React Testing Library. Tests are colocated under `__tests__/` or in
`src/__tests__/`. Inspect `jest.config.ts`, `jest.setup.ts` and a nearby test first:
database, fetch, auth, server actions and AI SDKs have substantial global mocks.
Override only what the scenario needs. Those mocks don't prove grants, live auth or providers.

For API tests, register mocks before importing the route; use resetModules + dynamic import
when module-level initialization needs isolation. Pass promise-shaped route params.
Response polyfills may already be installed; inspect the setup before adding one.

Test both the rule and its real caller. Cover authorization for writes, persistence/invariants
for data changes, and failure/empty states for integrations. The
[regression checklist](rnd/pre-push-checklist.md) records concrete past failures, including
caller wiring, source URL preservation and end-state migration checks.

## Dependency security baseline

Next.js is declared at `^15.5.25` and locked to 15.5.25, which includes the fixes for
[AVIF image optimization RCE](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) and
[Windows-hosted server RCE](https://github.com/advisories/GHSA-p293-qw3h-jr36).
With the currently locked image library, Next.js passes AVIF inputs through without decoding
or resizing them. Keep these fixes when updating dependencies.
The separate high/moderate findings reported by `npm audit` are not resolved by this patch.

## Verification

`package.json` is the command source of truth:

```bash
npm run type-check
npm run lint
npm run test:ci
npm run build
# Or all four, sequentially:
npm run ci
```

The released `type-check` script runs `tsc --noEmit`. If stale `.next/types` entries refer to
removed routes, regenerate them with `npx next typegen`, then rerun the check. Do not edit
generated definitions. Automatic regeneration in the npm script remains local feature-branch
work and is not included in this documentation release.

Jest runs without credentials (`NODE_ENV=test` has env fallbacks). Coverage remains available
through `test:coverage` and is checked by `test:ci`; no regression suites are removed for speed.
`next lint` currently succeeds with warnings and emits a deprecation notice; warning cleanup
is separate from errors.

A build without an env file needs these three temporary values. They prove compilation, not
working external services; don't write them to `.env.local`:

```bash
NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID=stub \
NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET=stub \
OPENAI_API_KEY=stub npm run build
```

For a focused Jest run, use `npm test -- --runTestsByPath <test-file> --runInBand`.
For browser tests install the matching browser once: `npx playwright install chromium`.
`E2E_BASE_URL` targets an existing server; otherwise Playwright starts local HTTPS on port 3001.
Inspect a test's effects before using a live URL: some E2Es create fixtures, claim artists or
write answers. Latest's read-only test is documented [here](artist-latest.md#verification).

`npm run test:smoke` uses the separate smoke config without global mocks.
`SMOKE_BASE_URL` checks deployed health. Storage integration tests may write and clean up
fixtures when storage credentials are available; don't run them against production casually.

## Branching and promotion

Effective policy: September 21, 2026, confirming the [September 18 R&D decision](https://docs.google.com/document/d/1wLmdfcAUakgY7BnUl_62lo24M0y81bIr5XdnviRggGg/edit), 35:59–40:40.

1. Branch features and fixes from current `origin/main`; attach each branch to its issue.
2. Review a PR to `main`. The staging branch is no longer an integration step.
3. After an authorized merge, test the resulting build in the persistent test environment.
4. After team approval and authorization, promote that same build to production without a second build. Pete, Sweetman and Carl should each have this ability.
5. Record the commit and deployment id; verify production and retain the previous known-good deployment for rollback.

The test environment remains separate from production even though the staging branch goes away.
Verify data/configuration targets before integration checks; this policy does not authorize
production writes. Main HEAD need not equal the production deployment.

**Configuration status:** Carl's #1310 and Pete's #1311 remain open. Exact promotion/rollback
commands or UI steps and shared permissions must be verified against Carl's configured setup,
not invented here. Branching from main applies now; a merge must not be assumed to deploy only
to test until that routing is verified. On September 21 Pete requested branch-only work: no PRs,
merges or production promotions in that session.

## CI and release verification

`.github/workflows/ci.yml` currently runs on pushes, PRs and manual dispatch. Its `test` job
runs type checking, lint and `npm test`; `build` follows. The separate coverage job is disabled.
Local `npm run ci` uses `test:ci` with coverage, so the local and remote commands are not yet
identical. A pending local workflow cleanup aligns them and avoids duplicate feature push/PR
runs; it is not part of this docs release. Post-deploy smoke remains a separate workflow.

Check required reviews and checks on the **current head SHA**. For failed checks, read logs
and separate defects from service outages before retrying. Don't keep requesting reviews that
add no new evidence. After authorized release, check deployment and smoke for the merged SHA,
not merely a green PR or a reachable old deployment.

## Database migrations

The app connects as `mnweb`. Database owners bypass RLS; successful owner SQL says nothing
about app access. Table grants and applicable RLS expressions must both permit the operation.
Existing role-wide policies do not isolate individual users; application authorization does.

For new/changed tables, inspect the target environment's grants, policies and ownership first.
Include required grants, RLS enablement and explicitly scoped policies in migration SQL.
Do not copy permissive policies without confirming the feature's security model.

1. Change the schema and commit migration SQL together with `drizzle/meta/_journal.json`.
   Run `npx drizzle-kit check`.
2. Verify the dev target, apply through an authorized DDL-capable connection, and exercise the
   app-role path. `mnweb` is not a schema owner and cannot run DDL.
3. Arrange production migration before code that depends on the schema deploys.
4. Verify final types/defaults/nullability, backfills, grants and exact RLS roles/expressions.
   Verify remaining state after **all** migrations, not counts of SQL statements.
5. Distinguish correct live schema from migration-history reconciliation. Manual SQL has caused
   drift tracked in [#1148](https://github.com/xdjs/MusicNerdWeb/issues/1148); do not wire
   `db:migrate` into deployment until it is resolved. One `IF NOT EXISTS` does not make an
   entire migration safely rerunnable.

`db:generate`, `db:push`, `db:migrate`, `db:studio` exist, but a script's existence is not
permission to run schema writes. See the [production runbook](rnd/prod-migration-runbook-2026-09-02.md)
and [prior RLS incident](db-fixes/2026-07-27-prod-rls-fix.md) when doing migration work.

## Lore explanation and account color

September 14, 2026 — Pete approved the fixed Lore introduction: “Stories, interviews,
and other sources curated by the artist.” It appears under the heading before filters,
including the empty state. The public page no longer reads the generated Lore summary
for this introduction; source cards, moderation and stored summaries remain unchanged.

Login/account controls use `highlightpink` (`#ff75d8`), shared with highlighted homepage
words, including the loading state and a pink hover treatment. The homepage border accent
uses `brandpink` (`#ff9ce3`); existing artist-page `pastypink` is unchanged.
Tracked in [#1255](https://github.com/xdjs/MusicNerdWeb/issues/1255).
