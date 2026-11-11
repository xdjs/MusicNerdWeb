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

## Follow-up: narrow API fencing candidate

Separate API branch `codex/revocation-upload-fencing` is based on `4f7c2705bde7545c53270fbd732d804aa5d7ca77`, without #1655 or chat changes.

- Profile image publication captures the approved claim before storage work and writes only through `withArtistUploadWrite`, which locks the artist and checks the same claim and actor. Revocation winning first produces 403 and leaves bytes for reconciliation; publication winning first is subsequently cleared by Web revocation.
- Sign binds the original claim ID into the authenticated ticket. Completion rejects tickets from replaced/revoked claims, even for the same user. Legacy tickets without this field must be uploaded again.
- Existing-source and ambiguous-commit recovery reads use the same authorization fence and transaction. They cannot return saved source content after losing that authorization.
- Completion publishes with `upsert:false`. Duplicate completion or uncertain upload acknowledgement is reconciled only when downloaded bytes exactly equal the requested bytes; mismatches/unreadable identity fail closed. Existing rows remain the normal retry fast path.
- Request-time public, staging and stale-profile deletion is deferred. No absent DB row is treated as permission to delete. A signed PUT can recreate a staged key, and another request may be about to publish a reference. This explicitly trades orphan accumulation for avoiding loss of replacement bytes.
- All these upload entry points reject an unclaimed artist with 403 for now, including administrators. `null` is not a unique generation: unclaimed → claimed → revoked → unclaimed is an ABA race. Supporting unclaimed uploads requires a durable artist ownership epoch; current-role inference or a fresh null check is insufficient. This conservative restriction needs product review before release and coordination with the trusted-contributor candidate.

### Physical cleanup design (not implemented or executed)

Add a durable object lifecycle record for each upload: server-assigned immutable key, owning artist, original claim/ownership epoch, expected byte digest, lifecycle state and retry identifier. Reference creation must lock/check this record as well as the artist; every API/Web writer must honor it. New uploads never reuse keys. For staging, retain until the signed capability expires, including a grace period for requests already in flight.

A cleanup transaction revalidates all live references and retention/moderation rules, then marks the exact lifecycle record permanently non-publishable. A worker deletes only the corresponding immutable object generation, using a provider conditional delete/version where available. Without conditional deletion, all writers must be fenced against recreating the permanently tombstoned key; expire old signed capabilities and drain legacy deployments first. Never use a folder listing as deletion authority.

Database failure before the tombstone means no storage operation. Storage failure leaves the tombstone and durable retry intact. Lost delete acknowledgement is reconciled by object absence/version, without retargeting a replacement key. Final DB receipt failures retry the same identity. Legacy objects with unprovable identity remain deferred for explicit review. Test real PostgreSQL concurrency and mocked storage failure/response-loss schedules before enabling any worker.

### Validation update

The Web build passes using the dummy `stub` values documented in `docs/development.md`, with a temporary Node preload blocking fetch and HTTP calls. No provider verification or live data operation was performed. This supersedes the earlier missing-environment build blocker; it does not establish working live integrations.

API checkpoint: `742f2c4` on `codex/revocation-upload-fencing`. Validation: 931 passing suites plus one skipped; 4,591 passing tests plus nine skipped. Types, lint and format pass. The API webpack production build passes with the same network-blocking preload. Independent exact-code review found no new correctness blocker in the fencing candidate and confirmed the compatibility/storage limitations above. Earlier unfenced-writer and upsert findings describe the base/released code; the companion API patch addresses those paths locally and must ship coherently with the Web candidate after remaining policy review.

## Correction: independent trusted Lore must remain possible

The blanket unclaimed-upload restriction above is **not an acceptable final product behavior**. Keep the current candidate unreleased. Pete confirmed that content contributed while its author was whitelisted retains its recorded trust after the author later loses access. His unclaimed-artist exception covers trusted Lore content/URLs and their use in chat, About and Lore generation; it does not grant arbitrary artist/profile editing or skip onboarding.

Use two explicitly signed server-assigned upload scopes:

1. **Claim-bound:** capture the non-null approved claim ID and actor; validate that exact identity at every final write/recovery. Never convert an old claim ticket to an independent contribution after revocation, even when its actor is now an administrator or whitelisted.
2. **Independent Lore contribution:** issue only to a currently authorized trusted/admin contributor for an unclaimed artist. This permits appending a new Lore source, not profile-image writes, changes to other sources, artist fields, claimant operations or broad research. Claim lifecycle changes do not cancel this independent authority; it is intentionally not represented by a null claim generation.

At the first durable submission, lock the artist and current contributor role, then insert the source and its matching `trusted_submission` event atomically. Successful insertion is the submission-time boundary already used by `writeVaultSource`. Trust lost before insertion cannot mint a newly trusted source; role loss afterward cannot downgrade existing provenance. Explicit private publication and pending/rejected moderation must override trust. Do not alter an existing source's moderation or publication on a retry.

A separate durable completion identity is required before enabling this scope. Bind a stable server-created submission/source ID and user/path into the signed ticket; retain a completed/deleted tombstone independently of source deletion. Retry must distinguish never committed, already committed, uncertain and intentionally deleted. Otherwise an old still-valid ticket can recreate a moderated/deleted independent contribution. Signed identity and original event evidence can authorize an idempotent completion receipt after role loss; this must not silently grant a private source-body read or new mutation permission. Existing-source content retrieval continues through its ordinary access gate. No durable receipt or contribution-scope route is implemented in this checkpoint.

**Verified integration blocker:** the source-publication worktree inspected at `/Users/peterarango/Documents/Codex/2026-10-29/task-3/musicnerd-api-source-publication` remains at base `4f7c270` with an uncommitted candidate. Its `publicVaultSourceSql.ts` (SHA256 `cef16a7b0492bb49a0ed3852a79edc7e5f5be82e1b22e9c017e59db6150d4b4c`) accepts approved explicitly-public sources, or inherited sources with an approved claim. It has no trusted-event eligibility branch. An in-memory PGlite check against the exact helper confirmed: approved inherited trusted Lore is excluded unclaimed, included claimed, then excluded again after revocation; private/pending/rejected sources remain excluded. Do not merge an implicit `publication='public'` upgrade to work around this mismatch.

Coordinate the immutable-trust eligibility predicate across that worker's API reads, PDF access, source revisions, About/Lore inputs and Web projections. The user policy is settled for trusted Lore retention; the implementation is not integrated. A separate product decision remains for independent administrator **profile-image editing**, which is outside this Lore contribution permission. Physical storage lifecycle/privacy limits are unchanged.

Additional negative/race regressions pass: a revoked claim ticket cannot gain independent authority through admin permissions; revocation after the initial check prevents a preserved source body from being returned. These tests protect the claim boundary, not proof of the still-unimplemented positive contribution flow. Independent review approved the proposed scoped design with the receipt, original-event and moderation requirements above.

## Integrated positive flow checkpoint (supersedes the blanket block)

The isolated `codex/revocation-trusted-lore` API/Web pair now implements independent trusted Lore file contributions through **sign/complete**. It includes a snapshot of the source-publication candidate; its original worktrees, #1655 and chat branches are untouched. This remains local and unreleased.

- For unclaimed artists, `/api/vault/upload/sign` admits a currently whitelisted/admin contributor and signs `scope=contribution`, a stable server-generated source ID, authenticated user, artist and exact storage path. Ordinary users are denied. Claimed uploads retain their original claim-bound authority; no old ticket can upgrade after revocation.
- `/complete` validates the signature/scope/path. Independent insertion locks the artist and contributor role, records its own immutable `source_upload`/`trusted_submission` event and inserts the approved source in one transaction. It does not create a claim, reset onboarding, approve another source, queue broad research or grant profile editing. Submission-time trust means the successful insertion transaction, not signing time.
- The signed source ID plus its original event provide durable completion identity without another table: event source IDs deliberately have no source-deletion cascade. An existing source returns only `{id}` with `receiptOnly=true`; no private body/URL is disclosed. A retained event with no source returns 410, never recreating deleted/moderated content. Duplicate completions serialize under the artist lock. Lost acknowledgement is reconciled against the same receipt.
- Trust lost before first insertion is denied. Trust lost after successful insertion neither downgrades original provenance nor destroys the actor-bound receipt. Existing private/rejected status is never rewritten by retry. Claim-bound uploads also record actual submission-time trust under a user-row lock without changing owner moderation behavior. Original claim authority still controls whether that ticket may complete.
- The legacy multipart endpoint returns 409 for independent uploads and directs clients to sign/complete. It cannot safely provide durable retry identity before the multipart request; it does not silently create a fresh independent upload on each retry. Web uses sign/complete.
- Web offers trusted non-editors an append-only file button on unclaimed profiles. It preserves the completion ticket through ambiguous failures and refreshes after receipt-only success. It exposes no moderation, profile-image or claimant controls. Admin/claimant VaultManager also handles receipt-only responses without inserting incomplete source objects into the UI.
- Original administrator profile-image authority is restored for unclaimed artists, with an artist lock and current-admin role lock at final write. Whitelist alone never grants that authority. Non-null claim-bound profile requests remain tied to their original claim; there is no fallback promotion.
- Public API and Web source visibility recognize the source's own immutable trusted event within `publication=inherit`. Explicit `private` and pending/rejected statuses override trust. Today's role is not consulted for historical eligibility. Web public props omit extracted text; original-read paths revalidate policy/revision before reuse.
- Eligible uploaded plain text, Markdown, CSV and JSON now enter public text-original discovery; PDFs retain the bounded PDF reader. Other accepted binary formats may have no readable original and are not represented as parsed evidence. Public uploaded-text URLs use the same credential/secret-query filter as other citations. General/private knowledge normalization still suppresses upload URLs.

### Remaining release gates

The separate #1655 work must integrate this exact eligibility policy into Lore/About generation and unclaimed About publication before promising those outputs. This branch does not change `gatherDocMaterial`, grant generation controls to contributors, or run any generation. Completion says only that the file was saved.

Physical cleanup remains deferred. Activity receipts protect logical completion/deletion identity; they are not immutable storage generations, do not enumerate orphan objects and do not revoke public URLs. Existing cross-writer storage lifecycle, legacy capabilities and production concurrency still require the previously documented rollout/reconciliation work.

Migration `0060_source_publication.sql` belongs to the copied source-publication candidate. Its previously missing Drizzle metadata snapshot is now generated locally and checked against the declared schema. No migration has run against a live database. Coordinate migration and compatible API/Web readers before enabling public/private mutations; old readers that ignore privacy must not remain active. Do not roll back to an incompatible reader after private decisions exist.

Provider-free verification includes real in-memory SQL for receipt rollback, deletion tombstones, duplicate completion, submission-time trust, moderation/privacy overrides, claim revocation retention and API/Web public eligibility; UI tests cover denied admission, stable completion retries and receipt-only refresh. PGlite does not prove real multi-connection PostgreSQL lock scheduling or deployed bucket/CDN behavior. Independent exact-code review closed the direct-upload retry and secret-URL restoration findings.

Final local validation for this integrated checkpoint: API 938 suites passed / one skipped, 4,641 tests passed / nine skipped; Web 425 suites passed, 3,680 tests passed / six skipped. API/Web types and lint pass (Web retains existing warnings); API formatting and offline webpack build pass. The immutable-evidence policy intentionally fails closed when the original contributor identity/event has been erased or is ambiguous; role loss with an intact recorded user identity is supported and tested. No present-day whitelist lookup can repair missing historical evidence.

The Web offline production build also passes using documented stub Spotify values and a temporary preload that blocks fetch/HTTP; no live integration verification was performed.
