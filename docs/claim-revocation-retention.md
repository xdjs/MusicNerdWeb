# Claim revocation: retain verified trusted contributions

Local candidate only. Separate from MusicNerdWeb #1655. Not released or live-verified.

## Problem and change

`revokeApprovedClaim` previously deleted every artist vault source, cascading source versions and assessments, regardless of contributor provenance. `revokeClaimAction` then purged artist storage prefixes, including retained/new uploads and profile images. Neither operation distinguished trusted UGC from claimant content.

The candidate uses each source's own server-recorded activity event: event/source/artist IDs, user actor, matching submission/upload action, and `trusted_submission` trigger must agree. Matching trusted sources remain byte-for-byte unchanged, including pending/rejected moderation status and version history. Generated research and attributable nontrusted claimant submissions are removed. Unknown or conflicting provenance aborts the transaction before mutation; current roles are never used to infer historical trust.

Artist locking now precedes claim/source locking. Claim deletion still checks approved status, claimant and artist. Claimant research jobs, onboarding, generated documents and old pin behavior are reset as before. A managed profile-image reference from the configured storage origin is recorded then cleared; foreign images remain unchanged.

Storage listing/removal is disabled. Exact source paths and cleared managed profile-image references are recorded in admin-only audit receipts in the same transaction. Receipt failure rolls back revocation. Shared retained-source keys are omitted from deletion candidates. Receipts are investigation inputs, NOT permission to delete: they do not prove current object identity, other-artist references, or complete staged/derivative inventories. The action returns a cleanup-deferred warning. Generic database errors report uncertain outcome and ask administrators to refresh before retrying.

## Release blockers and policy decisions

- API signed upload completion uses upsert on reusable keys. Physical deletion requires immutable/versioned object identity, reference revalidation and durable idempotent retry; exact paths alone are unsafe. No cleanup worker is added here.
- The existing API profile-image writer authorizes before upload and writes `customImage` afterward without locking/rechecking claim identity. A request authorized before revocation can restore its reference. API claim fencing and stale-image cleanup coordination remain necessary.
- Retaining bytes does not revoke previously issued/public object URLs. This candidate does not claim physical privacy erasure.
- Unknown/legacy provenance requires explicit review; revocation intentionally remains unapplied. Do not retroactively infer trust from today's whitelist.
- Source retention is not publication permission. Integration with the pending trusted-contributor/publication candidate must verify that retained private or moderated sources cannot be exposed to the public or a subsequent claimant. Submission-time trust/publication policy is still awaiting Pete's decision; no publication fields or gates are changed here.
- Local PGlite tests verify SQL and transaction rollback, not real multi-connection PostgreSQL lock scheduling. Real concurrent upload/claim/review validation remains required before release.

## Local issue draft

Title: Preserve trusted contributor Lore and files when revoking an artist claim

Claim revocation currently deletes all Lore sources and purges artist storage folders, including trusted contributor content. Preserve verified trusted contributions and their version history without changing moderation/publication status. Remove only attributable claimant/generated content; require review when provenance is unknown. Replace blanket storage purge with generation-safe exact-object cleanup and durable failure recovery. Coordinate upload authorization/claim fencing so in-flight requests cannot restore revoked content or erase a replacement object.

Acceptance criteria: trusted UGC and file bytes survive; unknown provenance is not guessed; private/rejected content gains no visibility; retries and concurrent uploads do not delete replacement objects; cleanup outcomes are accurate; database failures roll back; provider-free regression tests cover retention, moderation, ambiguous provenance, stale claims, failure and concurrency paths.

Status: isolated local Web candidate with deferred storage cleanup. API fencing/publication integration and live verification remain outstanding. No production fix claimed.
