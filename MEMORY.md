# MEMORY.md — Music Nerd engineering handoff

Product implementation handoff updated 2026-09-06; documentation context checked 2026-09-09.
This is dated engineering state, not a changelog or proof of current deployment.
Read `CLAUDE.md` first and verify remote/environment state before release actions.

## Current task and release gate

**Latest/bookmarks feature work still needs Pete’s local review before its PR or release.**
Pete separately authorized the documentation cleanup to merge through staging to main on
September 9. That authorization does not include the feature code or database migration.
Feature branch: `pete/artist-latest`. Its product changes are local and uncommitted.
Documentation release branch: `pete/engineer-onboarding-docs`.

- Artist **Latest** is implemented: MNTv-inspired image cards for catalog releases, imported
  Instagram posts and answered interview questions, with filters and source-backed popups.
  Pete's local feedback changed it to one horizontal gallery on desktop and mobile (no grid).
  [Design, read path, limits and test command](docs/artist-latest.md).
- Pete clarified that **bookmarks must sync across devices by account**. The former button was
  localStorage-only. The branch now has account-owned persistence, an authenticated API,
  shared button/profile state, draft Save/Cancel, legacy browser import and account-merge
  preservation. [Contract, migration and verification](docs/account-bookmarks.md).
- Migration **0024_user_artist_bookmarks** is prepared with schema/journal/snapshot. Dev application
  approval was requested and has not yet been received. **Not applied to dev or production.**
  Local account browser verification requires dev setup; don't call it complete from mock tests.
- The local preview uses `https://localhost:3002` and the existing dev env file. Only the server
  started for this task may be restarted; other local app processes belong to the user.
- No Substack/profile update was published, and none is in scope.

## Documentation and team context — September 9

- Pete requested an onboarding documentation cleanup for Patrick Sweetman. Start with the
  [documentation map](docs/README.md); the [meeting index](docs/rnd/meetings/README.md) now
  covers available R&D/standup and related work-session notes from August 20–September 9.
- The September 9 meeting leaves Patrick's first tasks for Pete and Patrick to agree. Later
  meetings report In Process/link fixes and other work, but those reports do not establish
  that the changes are in this worktree. Compare the relevant branch/PR before acting.
- Read-only GitHub checks on September 9 still found staging at `3bb849d7`, main at
  `14053e51`, and no PR for `pete/artist-latest`. This does not re-verify deployment or databases.
- Documentation is being released separately with Pete’s September 9 authorization. The
  feature review/migration gates above remain pending. This documentation release contains no
  application code, workflow, package-script or database changes.

## Profile protection release — September 9

- **Release update, September 10 UTC:** #1215 merged to staging at `250c2015` after
  exact-head CI and Codex code/security reviews cleared `22cb4f99` with no findings
  and a thumbs-up. Production `artist_profile_protection` and
  `provision_lore_upload_staging` migrations are applied and verified as `mnweb`;
  In Process config, Lore job kind and private 10 MiB bucket are ready, RLS/privileges
  unchanged. Dutchy's full profile and bio-history fingerprints match the preflight.
  Existing platform advisory warnings remain separate. The existing
  [release PR #1217](https://github.com/xdjs/MusicNerdWeb/pull/1217) now contains the
  profile fixes plus docs. Its release-scope objection was resolved with current
  approval/setup evidence. A follow-up corrects the latest Drizzle snapshot from
  the complete schema and tests that an unchanged schema generates zero SQL;
  no migration SQL or runtime behavior changes. Full CI passes with 185 suites /
  2,276 tests / 6 skipped. That metadata follow-up is pending staging/main review.
  **Do not merge main; Carl owns that step.** Email Pete only after release review
  is fully green. Earlier in-progress notes below are retained verification history.

- **Profile protection / Lore repair in progress (2026-09-08):** isolated worktree
  `/private/tmp/musicnerd-profile-protection`, branch `pete/artist-profile-protection`.
  [Staging PR #1215](https://github.com/xdjs/MusicNerdWeb/pull/1215), latest code head `bdeedb98`.
  Pushed, not merged or deployed to production. Includes pinned-bio write guards, In Process,
  retired supported links, durable Lore refresh, and direct storage uploads retaining
  10 MB/file. The In Process column exists in dev/prod; the requested artist link was
  written and verified with the existing `mnweb` role without changing the bio.
  Dev migration/configuration is applied as of 2026-09-09; private upload bucket is
  provisioned with the 10 MiB limit. Verified In Process config, retired choices removed,
  Lore job constraint, `mnweb` privileges and enabled RLS; Drizzle check passes.
  Production's remaining migration/storage work is explicitly held until green light.
  Application release verification remains unfinished; do not assume deploy readiness.
- **Real-PDF verification:** all text from three approved PDFs (73 pages, one visually
  blank) matched stored extraction. A fictional studio anecdote from the synthesis
  prompt had leaked into a real knowledge document and was repeated by live Ask.
  Removed the worked example in this branch and stopped labelling AI-compiled context
  as ground truth. A separately reviewed, page-cited knowledge document was saved on
  production with explicit user permission; only `artist_docs` content/sources/timestamp
  changed. Profile row, bio history, claims and PDF source text were checked unchanged.
  Raw PDFs, evidence, prior doc and operation receipt remain in private `/private/tmp`
  artifacts, not in Git. This is a scoped repair, not a completed general ingestion system.
  Live Ask retest: the fabricated studio-name question now returns uncertainty; the
  delayed-cassette USB detail and closing artistic-philosophy question return correct,
  PDF-backed answers. Citation formatting still sometimes includes nonnumeric labels
  and needs a separate fix; do not describe this as end-to-end UI verification.
- **Verification (2026-09-09):** `npm run ci` passed: TypeScript, lint (existing warnings),
  184 suites / 2,275 tests passed / 6 skipped, coverage and production build with stub
  build credentials. Dev `mnweb` integration verified link writes and Lore job insert,
  coalescing and completion with transaction fixtures rolled back. Browser confirmed
  In Process, upload copy, a real PDF upload, and historical pin + regeneration protection.
  Real extraction yielded 79,823 chars; signed storage accepted 10 MiB and rejected one
  byte over. A stale local Gemini key returned 403; using the current Vercel development-
  scoped key completed the real Lore worker and rendered the resulting doc in the browser.
  Twenty-six Codex findings have been addressed, including the retired-platform audit and
  rejected-upload staging cleanup. Cleanup errors retain same-ticket retry; permission
  loss and recovered/saved uploads also attempt temporary-object cleanup.
  Live dev endpoint checks verified size/type rejection removes storage records and
  creates no public upload/source. Immediate downloads can return cached deleted bytes;
  storage listings confirmed removal. Disposable fixture and server were cleaned up.
  Bio-history save/pin/delete/unpin now reauthorize the original claim and current
  owner/admin under the artist lock. Caller tests and real dev `mnweb` transactions
  verified stale operations fail without clearing the selected pin; fixture removed.
  Final bio/Onboarding publication also checks original ownership under that lock;
  route, generator and onboarding callers carry the initiating context. Real dev
  transactions rejected stale publication without creating Lore or completion rows.
  Expired authentic upload tickets permit staging cleanup only; the live dev endpoint
  verified removal without publication. Forged/different-user tickets cannot delete.
  The audit passes against dev; three focused regression tests preserve active-platform drift checks.
  Onboarding and discovery now retain initiating ownership across async work, with
  short locked checks for checkpoints, answers/offers, source/link writes and social
  job enqueue/reopen. Caller regressions cover context propagation; real dev `mnweb`
  tests rejected stale writes without recreating records, and removed their fixture.
  Review must run again on this operation-wide ownership fix before merging.
  Follow-up fixes cover ownership-generation fencing, atomic onboarding publication,
  stale bio drafts, placeholder history and idempotent upload/save recovery.
  These follow-ups have regression/full-CI coverage, not a new real-login browser run.
  Pete approved admin revocation as the exception:
  clear the revoked owner's public bio and release its pin, preserving saved history.
  That policy fix passed full CI and is included in the branch.
  The SQL private-bucket provisioning alternative also verified on dev.
  Production DB/storage changes are
  authorized after staging green; main merge remains Carl's responsibility.

- Documentation PR #1216 merged to staging at `e8152341` during this review. Its handoff
  and docs are being integrated here without the unrelated local Latest/bookmarks code.
  The pending bookmarks migration also uses number 0024: its owner must renumber/rebase
  before release because this branch carries `0024_artist_profile_protection`.

## Latest/bookmarks evidence so far

- Live read-only Latest browser test passed on dev, with all three source categories:
  filter/open/close/source links, actual Deezer art, desktop and mobile overflow checks.
  The normal development auth fallback was active; this did not prove real Privy login.
- Stored Instagram image URLs in the sampled dev records failed; cards used the artist image.
  Durable social image storage/refresh is still a separate design decision, not implemented.
- After gallery feedback: six focused UI tests, type check, focused lint and the live read-only
  browser flow passed (single row, next/previous, keyboard/trackpad, filters, dialogs, mobile).
  Image audit confirmed nine of nine recent own posts already contain image URLs; retention,
  not basic extraction, is the missing piece. See the Latest doc for MNTv's actual sourcing path
  and a proposed bounded thumbnail-retention follow-up. No ingest or storage writes performed.
- Pete saw "bookmarks couldn't sync" during local review. Read-only dev verification confirmed
  `public.user_artist_bookmarks` is absent; 0024 remains pending approval, not an applied fix.
- Production build passed with the bookmark/auth UI changes included. Final type check and
  lint passed (existing warnings remain), and 180 Jest suites / 2,239 tests passed with six
  skips and coverage thresholds satisfied before the gallery revision above. The last backend guards/image fallback have focused
  and full-suite coverage but were added after the production build. These are local results,
  not GitHub CI or deployed checks.
- Account client tests cover independent query clients, not physical devices. Real Postgres
  verification passed in a disposable local instance: migration, exact RLS/ACLs, actual `mnweb`
  CRUD, public-role denial, concurrent writes/merge, stale edits and cascading deletion.
  [Repeatable isolated check](docs/account-bookmarks.md#verification).
  The verification database was removed and its disposable Postgres cluster stopped.
  The opt-in two-browser account E2E exists but has not run against migrated dev.
- The branch adds server wallet verification before account linking, and session refresh follows
  the surviving account after a merge. Wallet-provider failure/ownership and merge behavior have
  regression coverage; real wallet linking has not been exercised.

## Operating improvements made with this feature

The former guide was 448 lines, README described Next 14/wallet-first auth/Node 18 and a
nonexistent env template, and local type checks failed on deleted routes' generated types.
`CLAUDE.md` is now short; setup and technical detail live in `docs/development.md`.
The pending local `type-check` change regenerates route types. The pending CI cleanup retains
PR + staging/main checks without a duplicate
feature push run, uses the same coverage command as local CI, and removes the already-disabled
coverage job. No active regression tests or thresholds were removed. Workflow YAML structure
was checked locally; remote CI has not run for those pending workflow/code changes.
Those script/workflow edits are not included in the documentation release.

## Last known remote / database state

- [#1214](https://github.com/xdjs/MusicNerdWeb/pull/1214) is merged into main:
  `14053e512d3a6f402f47383827fe1fe0f7d99ce4`, confirmed via GitHub on 2026-09-06.
  This carries the shared operating docs. Production deployment/smoke for that merge was not
  re-verified in this task; a merged PR alone is not deployment evidence.
- At task start, staging was `3bb849d7` with no product-code delta from main; this branch is
  based on staging. Fetch/compare again before creating a future PR.
- Migrations 0022/0023 were directly verified in dev and production at the prior 2026-09-04
  handoff: sitting backfill, offered_at type/default/not-null, mnweb access and policies.
  This task did not re-run or change them.
- Historical draft #1159 was closed as overlapping shipped research work; don't revive without
  comparison and re-scoping.

## Next, after Pete's local review

1. Resolve the image/interaction feedback on Latest; reliable historical Instagram images remain
   the largest visual limitation. Do not add an ingestion/storage system before that decision.
2. Once authorized, apply/verify 0024 on dev and run the account browser flow; production must
   receive 0024 before dependent code deploys at the later release gate.
3. Only after local approval, prepare a reviewable PR to staging, separating Latest, account
   bookmarks, and operating cleanup in the review/commits. Do not release solely for a handoff.
4. Later product queue: user-profile redesign and Dupes/YouTube-playlist prototype.

## Existing reliability debt

- [#1148](https://github.com/xdjs/MusicNerdWeb/issues/1148): reconcile manual schema state with
  Drizzle history before automated migration replay.
- [#1149](https://github.com/xdjs/MusicNerdWeb/issues/1149): reconcile historical schema RLS
  definitions with live policies. This bookmark migration must not rewrite unrelated drift.
- [#1150](https://github.com/xdjs/MusicNerdWeb/issues/1150): CI/smoke work partly supersedes it;
  triage separately.
- Server-only Spotify secret naming and [#1151 upload size](https://github.com/xdjs/MusicNerdWeb/issues/1151)
  remain follow-ups. Supabase schema-discoverability warnings on existing interview tables were
  previously checked as not granting public row access; don't silently broaden grants.
