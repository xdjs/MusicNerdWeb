# MEMORY.md — Music Nerd engineering handoff

## Local homepage reference exploration — not released

September 11: Pete supplied a mobile reference and circular pink Music Nerd logo
for `pete/homepage-design-system`. Isolated worktree:
`/private/tmp/musicnerd-homepage-design-system`; preview `http://127.0.0.1:3020`.
The latest iteration uses a pale background, centered logo, stacked manifesto and
search below the copy. Existing activity, add and login remain. Pete requested
removing all assistant-added copy; only existing homepage wording is used.
Homepage/activity/search suites (29 tests), TypeScript and lint passed (existing
non-home nav image warning). Full release CI and real auth remain unverified.
No push or release. See [scope and local review](docs/homepage-design-system.md).

## Meeting transcript automation — prepared, not active

Pete authorized publicly readable verbatim transcripts for Music Nerd Stand Up and Music Nerd
R&D on September 10, 2026. [Setup and behavior](scripts/meeting-transcript-sync/README.md).
The standalone Apps Script follows actual Calendar events, reads only their generated Transcript
tabs, and creates/updates public transcript PRs to staging. It does not merge or deploy.
Google project: `1VrYdy6udaGH1FJ-CQXsPFmH1gA5_iUspPnAviKwcOVjYy48ymexOTSte`.
Code and manifest are prepared with START_DATE September 10. Google OAuth authorization,
the repo-scoped GitHub token, first live publication, and the recurring trigger remain pending.
Seven focused tests pass. Today's actual source exported 38,965 characters with exact text
preservation. Full app CI passed (185 suites, 2,284 tests, 6 skips, typecheck, lint, build).
These checks do not establish an active schedule or a successful live Google→GitHub write.

Checked September 10, 2026. Verify live GitHub/environment state before acting.
Read CLAUDE.md first. This is current state, not a release authorization.

## Current release: Deezer logo and public docs

Pete authorized merging the Deezer logo and outstanding public docs to staging, opening a
staging → main PR and emailing Carl to request the main merge. Carl still owns main.
Branch: `pete/deezer-logo`; isolated worktree: `/private/tmp/musicnerd-deezer-logo`.
The shared `public/siteIcons/deezer_icon.svg` now uses the official purple heart. Existing
icon consumers retain the same path. No runtime logic, database or permissions change.

Included docs: this handoff, profile-release lessons, pre-push checklist, retro input,
September 10 agenda, GEO reading-list entry and the aggregate Scrapling experiment report.
Scratch notes, raw captures, PDFs, credentials and contact lists are not included.
Docs describing unshipped local feature code were not copied over newer released guidance.
Check this branch's PR/checks for its current merge/deployment state; a local asset edit
alone is not deployed. Do not push status-only commits after review clearance.

## Previous profile release: merged

[PR #1217](https://github.com/xdjs/MusicNerdWeb/pull/1217) merged to main September 10 at
03:58:29 UTC. It includes #1215 profile protection, #1216 onboarding docs, #1218 migration
metadata and #1219 ownership/Lore guards. Production database changes were applied and
verified before release. The production page now renders In Process under Support the Artist.

[Evidence, changed areas and review lessons](docs/development/profile-release-handoff-2026-09-09.md).
Full release CI passed: 185 suites / 2,284 tests / 6 skips, type check, lint, coverage and build.
Code/security reviews completed; two disputed recommendations were assessed with evidence,
not patched for a badge. Do not reopen those findings without new evidence.

Protect the current bio: no regeneration as a test. Pins prevent ordinary overwrite until
unpinning. Approved admin claim revocation clears public bio/pin while preserving history.
General PDF retrieval/OCR and source-quality policy are not complete.

The authorized one-artist prod → dev content sync is complete and verified, including
byte-identical PDFs in dev storage. Dev retained its own artist ID; matching used the exact
Spotify ID. Production content was unchanged. Accounts, claims, sessions and queued jobs
were not copied. Private backup/transfer evidence stays outside Git; do not rerun blindly.

**Open bug:** Supported links hides valid In Process URLs because its wallet-example filter
matches their address. The saved link and profile display work. Fix separately; it is not
part of the logo/docs release.

## Separate local Latest/bookmarks work — not approved for release

Original checkout: `/Users/peterarango/cursor experiments/MusicNerdWeb`, branch
`pete/artist-latest`. Large dirty worktree belongs to Pete; do not reset, stash or stage all.

- [Latest](docs/artist-latest.md): local horizontal gallery with release/social/interview cards.
  Dev read-only desktop/mobile checks passed using the development auth fallback, not real
  Privy login. Durable Instagram image retention remains unresolved.
- [Account bookmarks](docs/account-bookmarks.md): local account-backed storage, shared state,
  legacy import and merge preservation. Local Postgres checks passed; the real two-browser
  dev flow has not run. Wallet linking has unit coverage, not real-provider E2E evidence.
- Pending `0024_user_artist_bookmarks` is **not applied to dev or production**. It conflicts
  with released `0024_artist_profile_protection`: rebase/renumber and regenerate metadata
  before its separately authorized migration. Do not replay historical migrations.
- Pending route-type/CI workflow cleanup is local, not in this release. Released docs correctly
  describe current scripts. User's local HTTPS server on port 3002 must not be disturbed.
- Pete must review locally before that feature PR, migration or release. Earlier local suite
  evidence (180 suites / 2,239 tests, 6 skipped) is not current release CI.

## Team and next work

[September 10 agenda](docs/rnd/agendas/2026-09-10.md) was posted to Music Nerd's agenda channel
September 9 at 11:57 PM Eastern and visually verified. Do not resend it.
The [meeting index](docs/rnd/meetings/README.md) covers available notes through September 9.
Patrick's first task remains for Pete/Patrick to agree; agenda questions are not decisions.

For the next review: audit all affected callers, batch code/security findings across all
SHAs, fix proven release blockers, defer optional work and rebut incorrect findings with
reproduction evidence. Stop when scoped behavior, required CI/reviews and release readiness
are established. Never weaken protections/tests to merge. See the
[pre-push checklist](docs/rnd/pre-push-checklist.md).

Historical schema reconciliation #1148 and RLS drift #1149 remain separate; no full migration
replay. CI triage #1150 and server-only secret naming remain separate debt. The previous
release addresses 10 MB upload transport/copy (#1151); closure requires deployed verification.
Existing platform advisories are not permission to broaden database grants.
