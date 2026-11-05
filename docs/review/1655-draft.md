# Draft Web PR — local, not published

Title: Preserve contributed Lore and About through setup and public reads

Preserve artist edits, pins and eligible trusted Lore while profile setup fills missing material. Public About, history and Lore readers honor source publication and private evidence. Trusted contribution permission does not grant profile editing or regeneration authority. The approved legacy exception is limited to the exact 16 claimed-artist text snapshots, without invented provenance or future blanket trust.

Requires the paired API evidence/receipt writers and reconciled migrations 0060–0064. Migration 0064 provides a private lock-only function executable by mnweb; it adds no activity-event UPDATE or DELETE permission. Install it before the corrected API. The candidate also includes trusted-upload and claim-revocation preservation dependencies; review the coordinated stack explicitly.

Validation: the paired candidate passed 32 native PostgreSQL 17 tests with both browser suites and immediate-restart readback. Actual setup, manual save, pin/reload and repeated setup preserve content under deterministic local adapters. Genuine hosted Privy login and two synthetic regenerations now pass: missing Lore is prepared before About, and an existing current document is reused. Database readback confirms history, provenance, receipts, source preservation and no active jobs. Hosted claimant onboarding and production role compatibility are not established by this admin-only test. Earlier Web tests/types/offline build remain separate evidence; the staged Web application code is unchanged from 313a9069.

Production gates: reconcile migration state; validate and activate the exact 16 allowances before guarded readers receive traffic; complete the guarded raw-reader/client cutover; coordinate API/Web/background writers and a compatible rollback pair. 0063 seeds no allowances. The raw-reader projection remains a prototype, not a completed production cutover. Do not roll back to unguarded readers or discard evidence.

Refs #1655. Link the paired API draft; do not auto-close before release acceptance. Main was checked read-only on 2026-11-05: 03b2d9a556644d4ec7121fca398977057ad8c90f. No push, publication, merge or production deployment performed.

Local CI follow-up: added the function-only 0064 snapshot with unchanged declared schema and correct parent linkage. All 434 Web suites passed (3,768 tests; six skipped), along with types, lint, build and 116 release/migration regression tests. Dependencies were reused locally; fresh lockfile installation and hosted CI remain unverified. No application or migration SQL changed in this follow-up.
