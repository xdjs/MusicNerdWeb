# Draft Web PR — local review text, not published

Title: Preserve trusted Lore and About through claiming, setup and public reads

The coordinated candidate retains existing artist edits, pins and eligible contributed Lore during setup while filling missing material. The pending-research UI must keep retained content visible and avoid describing it as a newly generated draft. Public and historical readers use private evidence lineage; the approved legacy exception is limited to the exact 16 snapshots, without fabricated source provenance.

Requires the matching API receipt-aware writer and reviewed migrations 0060–0063. Dev schema drift must be reconciled, not blindly replayed. The guarded projection/client cutover remains a separate reviewed artifact until actual reader mappings and permissions are approved. The new schema must exist before the corresponding readers/writers receive traffic.

Validation includes local onboarding/component and preservation regressions, migration/native PostgreSQL checks, and the separate hosted actual-API fixed-fixture test. The latter does not execute this artist-page onboarding flow. The final browser acceptance must click the real artist About control and complete pending setup on a dedicated synthetic fixture against durable storage.

Prepare as a linked draft after reconciling current main and the trusted-source prerequisites. Keep unrelated cleanup changes out of this scope. Record "Refs #1655" until coordinated release evidence and Pete's acceptance are attached; do not imply the preview changed shared staging or production.

Current local review branch: `codex/1655-web-review-20261105`, incorporating fetched main `03b2d9a556644d4ec7121fca398977057ad8c90f` at merge `71b7c46ef19bb1d095fab79ceee2bea499f41454`. Paired API branch: `codex/1655-api-review-20261105`. The integration candidate also includes trusted-upload/publication and revocation-retention prerequisites; explicitly review or extract those scopes before publication. The upstream merge changes documentation only.
