# Automatic ingestion of approved Lore URLs

October 5, 2026. Refs [#1424](https://github.com/xdjs/MusicNerdWeb/issues/1424).
This is phase-2 plumbing. Web saves ingestion requests; MusicNerdAPI fetches and stores
the originals. The interviewer integration remains a later PR.

## Contract

Adding an approved URL, approving an existing pending/rejected URL, and admin bulk
approval each save a `source_extract` job in the same transaction as the source change.
Pending/rejected sources, uploads and sources with nonempty originals are ineligible.
An existing live job for that source satisfies a repeated request. A different source
gets its own job even while another extraction is running; batches cannot silently lose
the twenty-first source. A failed queue write rolls back the source mutation.

Automatic jobs contain one source ID/URL, the current approved claim generation and
the activity ID of the addition/approval. Version 2 state marks these as approved-source
ingestion, not a user impersonation. The internal worker checks the same approved claim,
live lease and unchanged approved source before fetching and again before storing text.
Trusted contributor approval authorizes collecting that public source; it does not grant
the contributor general artist editing. Existing version-1 explicit claimant/admin jobs
retain their authorization and 1–20-source API contract.

Migration 0038 retains existing live-job uniqueness and conflict-query compatibility.
Automatic jobs wait in an internal `queued` state, with one waiting/live job per
artist/source. The API claims one per artist at a time; public status reads report
waiting jobs as `pending`. Old workers safely ignore the new backlog. No new table, service, public endpoint,
grants or RLS policy is introduced. Each source is attempted once per add/approval;
blocked/unsupported reads finish visibly, with no automatic endless retry. Ordinary
knowledge reads do not fetch. Existing originals remain unchanged.

Web's ordinary URL add/onboarding paths stop detached text enrichment. Podcast metadata
resolution remains awaited because episode identity is required by the existing UI;
it is separate from the durable HTML-original extraction. Existing research discovery
that already supplies original text is unchanged. Ingestion completion does not assert
editorial source verification or promise a regenerated Lore summary.

## Release and verification

Requires Web#1431 / migration 0037, then 0038 before the new API or Web writes.
Release API#20 with its version-2 worker before Web automatic queueing. The additive
migration leaves existing worker and enqueue behavior intact.
Production migrations and releases remain separate approvals.

Verify transactional add/approval/rollback, more than twenty sources, overlapping live
jobs, repeated approval, pending/upload/existing-text exclusions, claim replacement,
source rejection/URL change during a fetch, lease replay, blocked fetches and preserved
originals. Exercise the real app database role and exact API preview with disposable
staging fixtures. Do not submit the staging add-link modal into the real review queue.
Immutable historical source versions and interview boundaries remain subsequent work.
