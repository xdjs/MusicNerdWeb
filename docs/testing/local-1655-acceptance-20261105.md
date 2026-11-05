# Local Web acceptance for #1655 — 2026-11-05

Source: `0ffa580541e7dc5d5c3f22c9a03639d668cab42f` in `/tmp/mn-1655-web-review-20261105`. No application code changed. This is local evidence, not a release or hosted acceptance record.

## Results

- Node24.16.0: **20 focused suites,246 tests passed** across three runs (209+27+10).
- Standalone TypeScript: passed.
- Production Next build with documented dummy Spotify values: passed, including its lint/type phase; existing warnings remain.
- Release storage guard run separately with no Vercel configuration: explicitly skipped, not a storage verification.
- Build and tests used the API prototype's `deny-network.cjs` preload, which blocks fetch, HTTP(S), sockets, TLS and DNS. Build sitemap queries hit the blocking guard and used their fallback path. No shared database or provider was contacted.

The review worktree had no dependency installation. Its package.json and package-lock.json hashes exactly matched the existing local dependency worktree; an ignored node_modules symlink reuses those dependencies. No install/download occurred. Environment-file existence was checked before execution; no environment-file contents were read. Commands ran with an empty inherited environment and explicit dummy/runtime settings.

Evidence logs in `/tmp`:

- `mn1655-web-acceptance-tests.log`:16 suites209 tests; request helper, Blurb UI, ArtistPage, public projection/provenance/legacy allowance, persistence/history, migration snapshot.
- `mn1655-web-acceptance-extra.log`:2 suites27 tests; bio hook cache and admin claim actions.
- `mn1655-web-acceptance-paths.log`:2 suites10 tests; public About presentation and onboarding gate. These bracketed route paths were run with Jest `--runTestsByPath` to avoid pattern interpretation.
- `mn1655-web-acceptance-types.log`
- `mn1655-web-acceptance-build.log`

## Observed Web contract

`BlurbSection.handleRegenerate` sends one PUT through `requestArtistBioUpdate`, with `{regenerate:true}`. It disables regenerate/save while a request is active and does not retry with GET. Success replaces editor text and refreshes displayed bio/history/profile. A non-OK response shows the API error; transport failure shows a retry message and preserves the previous text. Existing UI tests exercise success and failure with mocked fetch, not a running API.

`requestArtistBioUpdate` requires a Privy access token; it sends bearer authorization to `/api/artistBio/{id}` with `credentials:'omit'` and `cache:'no-store'`. Tests assert this request and reject missing-token fallback. `NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL` can target loopback in a nonproduction build; it must be set before building. The reviewed build explicitly targets `http://127.0.0.1:3001`, but no server connection was attempted by these mocked UI tests.

Public ArtistPage and metadata use the server projection. `HeroSection` passes `bio ?? ''` to BlurbSection. That explicit empty value overrides the hook's five-minute localStorage cache, preventing hidden legacy prose from reappearing. The hook regression asserts no fetch and no cached legacy text when the server hides About. Subsequent-render/metadata tests cover consumed legacy allowances.

Claim approval attempts source research, interview preparation and the API build. An incomplete claimant page starts/resumes setup; a complete-on-arrival page renders normally. These Web assertions do not replace the API/native evidence that the parent is gathering.

## Initial integration gap (superseded for the focused flow below)

During the initial acceptance pass, no real browser Web→API HTTP test was performed. A provider-free signed-in Web browser needs an explicitly isolated test authentication boundary: production `getAccessToken()` depends on Privy, and `PrivyProviderWrapper` skips the provider when the app ID is absent. Inventing a token or enabling the development admin fallback would not prove production authentication. The current UI tests deliberately mock Privy/fetch; native API requests are a separate layer.

A next local integration can reuse the loopback API and its synthetic database, but needs a reviewed test-only Web auth fixture plus a browser egress allowlist restricted to those local services. Full production pages also perform server-side database reads, so a local Web database configuration must point only to that synthetic database with an appropriate app-role permission matrix. No such server or browser was started here, and no application auth was modified.

Not covered: full Web suite/coverage, live sign-in, provider output quality, shared database/storage, hosted CORS/cookies, deployment, or release. No discovered application bug required a code change in this pass.

## Follow-up: focused browser → API → durable PostgreSQL acceptance

The separately built `docs/testing/local-1655-browser/` harness now exercises the real BlurbSection, requestArtistBioUpdate and useArtistBio through actual browser fetch/CORS to the real API route backed by the parent's isolated native PostgreSQL fixture. Four scenarios passed: missing Lore document, existing current document, About generation failure and Lore preparation failure. Each requires a single PUT; failures preserve editor text and display the API error. A hard navigation after clearing localStorage uses the real public GET hook and verifies the persisted biography in the editor.

The parent reported29 native tests passing and an independent process reading identical About, Lore, history, evidence, sources and jobs after an immediate PostgreSQL restart (`/tmp/mn-1655-browser-acceptance-final.log`). This establishes the focused component/request/API/database path, not the full Next ArtistPage.

Test adapters are explicit: fixed synthetic Privy token, editor context value, inert Next navigation, visible toast output, unpinned history stub, and inert correction dialog. Initial owner-visible text is a fixture prop. The README lists real and adapted imports. No production authentication bypass or app-code modification was introduced.

The runner creates only its own fresh Chromium process/context and loopback Web listener; routes are restricted to required paths on43165/43166. SIGTERM and SIGINT now run bounded, idempotent cleanup and retain nonzero signal exits/errors. A separate real-browser self-test passed for both signals, confirming the owned Chromium PID was gone, port43166 closed and temporary bundle removed. API/PG lifecycle remains parent-owned. Run listener tests serially because43166 is intentionally fixed.

Still unproven: complete Next navigation/server rendering, real Privy signature/session behavior, pin/history browser interactions, actual model quality, hosted deployment and browser-disconnect cancellation. No production/shared database or provider was used.

Signal-test scope: both signal regressions interrupt after browser/server startup. They do not inject signals during startup or prove cleanup after SIGKILL, which cannot be handled. The final integrated rerun passed29/29 native tests plus restart equality after the cleanup change.
