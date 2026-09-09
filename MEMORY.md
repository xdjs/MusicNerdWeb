# MEMORY.md — Music Nerd engineering handoff

Updated 2026-09-04. Read this after `CLAUDE.md`. This is current state, not a changelog; use the
linked PRs, issues, and decision notes for history.

## Live and verified

- **Production / `main`:** [`#1211`](https://github.com/xdjs/MusicNerdWeb/pull/1211) merged as
  `ff1e4472`, carrying the MusicBrainz fallback from #1209 on top of release #1200. Main CI, the
  production deployment, and post-deploy smoke all passed on that exact merge SHA.
- **Database migrations 0022 and 0023:** applied and directly verified in both dev and production.
  `artist_interview_answers.sitting` is backfilled with no nulls; `offered_at` is `timestamptz`,
  backfilled, `NOT NULL`, and defaulted. The app role `mnweb` has SELECT/INSERT/UPDATE on both
  columns. RLS is enabled and the expected four `mnweb` policies are the only policies on the
  table. Owner/superuser success was not used as the access check.
- **Interview flow:** the repeatable, opt-in interview and research readiness work is live. A
  sitting is assigned when questions are offered and is not changed when answers are upserted;
  `offered_at` preserves offer time. See [`#1204`](https://github.com/xdjs/MusicNerdWeb/pull/1204)
  and the release PR above.
- **Repository hygiene:** [`#1210`](https://github.com/xdjs/MusicNerdWeb/pull/1210) keeps local
  Substack artifacts, local data, and the Discord layout scratch file out of Git. Durable public
  docs and agent reasoning remain tracked per `docs/rnd/README.md`.

## Staging differs from main

- There is no product-code delta at this handoff. #1211 carried
  [`#1209`](https://github.com/xdjs/MusicNerdWeb/pull/1209) to `main`: its fail-closed MusicBrainz
  artist-ID fallback is live, and the two Claude GitHub Action workflows are removed.
- `staging` additionally contains the public operating-guide and handoff refresh from
  [`#1212`](https://github.com/xdjs/MusicNerdWeb/pull/1212). Those docs will reach `main` with the
  next normal release; do not create a release solely to move the handoff.
- There were no open PRs at the 2026-09-04 handoff. Old draft
  [`#1159`](https://github.com/xdjs/MusicNerdWeb/pull/1159) was closed without merging because its
  artist-research foundation overlaps the shipped research-job and resolver work. Do not revive
  its branch without comparing it to current `staging` and re-scoping it.

## Next work

- **Profile protection / Lore repair in progress (2026-09-08):** isolated worktree
  `/private/tmp/musicnerd-profile-protection`, branch `pete/artist-profile-protection`.
  [Staging PR #1215](https://github.com/xdjs/MusicNerdWeb/pull/1215), head `9d97ac63`.
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
  177 suites / 2,185 tests passed / 6 skipped, coverage and production build with stub
  build credentials. Dev `mnweb` integration verified link writes and Lore job insert,
  coalescing and completion with transaction fixtures rolled back. Browser confirmed
  In Process, upload copy, a real PDF upload, and historical pin + regeneration protection.
  Real extraction yielded 79,823 chars; signed storage accepted 10 MiB and rejected one
  byte over. A stale local Gemini key returned 403; using the current Vercel development-
  scoped key completed the real Lore worker and rendered the resulting doc in the browser.
  Codex's first two findings were fixed. Pete approved admin revocation as the exception:
  clear the revoked owner's public bio and release its pin, preserving saved history.
  That policy fix passed full CI and is included in the next review commit.
  The SQL private-bucket provisioning alternative also verified on dev.
  Production DB/storage changes are
  authorized after staging green; main merge remains Carl's responsibility.

1. **Artist-profile latest activity.** This is the agreed next product task: show interview answers
   ("nuggets") beside social updates, with a call to action back to the source post. The decision
   is in `docs/rnd/decisions.md`; the existing `ActivityFeed` is homepage-only, so the artist-page
   implementation has not been built. Define source-link behavior and test the display/query path.
2. **Later product queue:** bookmarks, user-profile redesign, and the Dupes/YouTube-playlist
   prototype.

## Reliability and cleanup

- [`#1148`](https://github.com/xdjs/MusicNerdWeb/issues/1148): reconcile manual database state
  with Drizzle migration history before wiring `db:migrate` into deployment. This remains the most
  important migration-process debt.
- [`#1149`](https://github.com/xdjs/MusicNerdWeb/issues/1149): reconcile `schema.ts` RLS policy
  definitions with the live policies.
- Supabase reports GraphQL schema-discoverability warnings for `artist_interview_answers` because
  broad table grants exist. Direct verification found no `anon` or `authenticated` policy and no
  public row access; treat schema hardening as separate follow-up, not a release blocker.
- CI currently triggers the same workflow for both push and pull-request events. The resulting
  duplicate runs are redundant executions, not different tests; optimize later if queue time
  becomes a problem.
- Triage [`#1150`](https://github.com/xdjs/MusicNerdWeb/issues/1150): CI and post-deploy smoke now
  exist and passed for #1200, so the issue is at least partly obsolete.
- Other active debt: the Spotify client secret still uses a `NEXT_PUBLIC_` name and should move to
  a backward-compatible server-only variable; upload size remains tracked in
  [`#1151`](https://github.com/xdjs/MusicNerdWeb/issues/1151).
