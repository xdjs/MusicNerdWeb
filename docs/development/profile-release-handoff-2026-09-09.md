# Profile release: handoff and review lessons

Checked September 9 Eastern / September 10 UTC. Engineering handoff requested by Pete;
not a meeting outcome. No artist source text or private test artifacts are included.

## Release outcome — updated September 10

#1217 merged to main at 03:58:29 UTC on September 10. The production artist page was
subsequently checked and renders In Process under Support the Artist. The review receipt
below records the pre-merge decision; it is not a remaining merge request.

A separately authorized one-artist production → dev sync is complete: exact bio/link,
3 saved bio versions, 4 Lore sources, 1 knowledge document, 8 corrections, 199 social posts
and 317 credits. Three PDFs were copied into dev storage and hash-verified. Existing dev
identity/creator were preserved; production accounts, claims, sessions and research jobs were
not copied. The staging browser shows the current About, In Process and dev-local PDFs.
Production was read-only and its before/after snapshot matched.

**Remaining separate bug:** the Supported links picker filters wallet-shaped examples and
incorrectly hides In Process URLs. Profile display and stored support are working; the
dropdown fix is not included in the Deezer logo/docs change.

## Historical review receipt

[PR #1217](https://github.com/xdjs/MusicNerdWeb/pull/1217), staging → main, is open at
`b3869c0f874da453b2b9a96a95ccbf2966da5d58`. Enabled CI checks passed; code and security
reviews completed at 03:34 and 03:45 UTC, with zero unresolved threads. This is not a
blanket bot approval: two recommendations were assessed with evidence below. GitHub
required human approval at that point. Carl owned the main merge; Pete was emailed.

Merged to staging: #1215 profile fixes, #1216 onboarding docs, #1218 complete Drizzle
snapshot, #1219 direct-link ownership/manual Lore throttling. Do not push handoff-only
changes into this reviewed release. Database readiness is not application deployment.

## What changed

- **Bio/history:** pin locks, historical selection, idempotent saves and preservation of
  actual text. Writes recheck current ownership under an artist row lock. Approved admin
  claim revocation clears the public bio/pin but preserves history. Never regenerate a real
  artist bio to test this. See `bioPersistence.ts`, `dashboardQueries.ts`, `ownershipWrites.ts`.
- **Async ownership:** `artistOperationContext.ts` carries the initiating claim across
  onboarding/discovery; short locked writes reject revoked/stale operations. It does not
  hold a transaction open across remote requests. Direct link set/clear uses the same guard.
- **Links:** In Process is supported; the requested profile link is already saved.
  Catalog, Foundation and Sound were removed from supported configuration, not from legacy
  artist data. The current artist bio was not rewritten.
- **Lore:** durable refresh uses current sources and fences stale jobs. Manual Look again
  has a 30-minute admission-based cooldown; pending/running jobs suppress repeated requests.
  Source changes invalidate immediately, independently of the manual cooldown.
- **Uploads:** signed private staging → authenticated validation/extraction → publication.
  Tickets bind user, artist, path, size/type and expiry. Recovery avoids deleting committed
  sources. Rejected/expired authentic uploads clean up staging; forged tickets cannot delete.
  UI says 10 MB per file; enforced maximum is 10 MiB (10,485,760 bytes).
- **Migration metadata:** complete latest snapshot plus a real Drizzle generation test:
  unchanged schema must generate zero SQL. This does not reconcile all historical drift.

## Evidence and limits

- Full CI: **185 suites, 2,284 passed, 6 skipped**, type check, lint, coverage and production
  build. Existing warnings remain. Build-only stubs were required for Spotify/OpenAI env vars.
- Dev browser: In Process, upload copy, real PDF extraction, historical pin/regeneration
  protection, real Lore worker completion and rendered output. Development auth fallback
  is not proof of real Privy login. No new production-login E2E was performed.
- Real database/storage fixtures: `mnweb` ownership/history rejection, concurrent Lore
  enqueue-once behavior, source invalidation, exact 10 MiB boundary and rejected-file cleanup.
  Temporary profiles/jobs/sources were removed; the user's local server was untouched.
- Three approved PDFs, 73 pages including one blank, matched stored extracted text. Full
  extraction was not the missing piece: synthesis had imported a fictional prompt example.
  Removed that example; a separately authorized, page-cited derived knowledge repair was
  verified through live Ask. Bio/history/claims and original PDF text stayed unchanged.
- General full-document retrieval/indexing, OCR and source-quality policy are **not done**.
  Citation formatting remains separate work. Do not claim one corrected document solves RAG.

## Database: already applied, do not replay

Dev and production have the reviewed `artist_profile_protection` configuration/job-kind
changes and private `lore-upload-staging` bucket (10 MiB, reviewed MIME list).
Production migrations were named `artist_profile_protection` and
`provision_lore_upload_staging`. App-role privileges/RLS and bucket settings were verified;
existing public bucket settings were not changed. Full profile and bio-history fingerprints
matched before/after. No further DDL is required for this release.

Historical migration reconciliation #1148, RLS drift #1149 and pre-existing platform advisories
stay separate. Do not run the whole migration history. The unrelated local bookmarks draft
also uses 0024: renumber/rebase it against released `0024_artist_profile_protection` before
its separately approved migration. Latest/bookmarks and CI cleanup are not in this release.

## Why the review loop ran long — rules for the next agent

1. **Audit the whole changed flow before pushing.** Narrow fixes left neighboring ownership
   paths exposed. Trace UI → route → shared persistence → async jobs; test real callers,
   not only mocked helpers. Search for the failure pattern across every entry point once.
2. **Batch findings, not review rounds.** Read all unresolved threads, including security
   comments on older SHAs. Wait for code and security reviews before making one coherent fix
   batch. Check CI/reviews against the exact head; completed does not mean approved.
3. **Use judgment.** Block on demonstrated release-caused security, data loss or broken core
   behavior. Defer unrelated hardening, refactors and alternative product policies. Reproduce
   disputed claims before changing code; resolve threads with evidence, never for appearance.
4. **Set an exit condition and stop.** Requested behavior verified, required CI passing,
   reviews complete, no actionable blockers, database ready, human release gate explicit.
   Do not demand platform-wide perfection or another bot badge; do not remove protections,
   tests or thresholds to get green. New changes require a concrete remaining blocker.
5. **Preflight verification.** Confirm environment, app role and credentials first. A stale
   Gemini key caused a false code failure. Schema metadata validation alone missed an
   incomplete snapshot: test the next generated migration, not only file validity.
6. **Keep handoff current, not chronological.** Separate local work, merged staging, applied
   SQL and production deployment. Stale release instructions caused avoidable objections.
   Update docs locally without restarting a cleared release for a status-only commit.

### Deliberate non-fixes: do not reopen without new evidence

- [Cooldown completion-time proposal](https://github.com/xdjs/MusicNerdWeb/pull/1219#discussion_r3975150293):
  admission-based throttling is intentional; active jobs always suppress duplicates.
  Six concurrent real requests enqueued once. Completion-based throttling is a different
  product policy, not a required spam fix.
- [Claim-revocation lock-order finding](https://github.com/xdjs/MusicNerdWeb/pull/1217#discussion_r3975216146):
  live transactions showed the writer already holding the artist lock commits before
  revocation under either ordering; actual guards reject writes after revocation commits.
  The proposed reorder did not fix the alleged bypass. General lock-order/deadlock cleanup
  can be considered separately; this evidence is not a claim that all concurrency is perfect.

## Follow-up

Do not reopen #1217 or replay its migrations. Use disposable profiles for further destructive
tests, not changes to the real artist's bio. Separately, Pete reviews local Latest/bookmarks
and prioritizes source trust/full-document retrieval and the supported-links picker fix.
