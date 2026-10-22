# Catalog disconnect deployment packet (#1580)

This packet is prepared locally. **Do not apply the migration or release the dependent API/Web changes until the owner explicitly approves the exact new schema and execution capability.** Migration DDL alone changes no artist data and performs no backfill, correction, or sweep. Rnd1's completed correction and exclusion are outside this change.

## Scope and ownership

Web owns Drizzle migration `0056_catalog_disconnect.sql`, its journal entry, and schema snapshot. SHA256: `72a33d1eec6333585dc0ac2312569a14dbbec7d8475beddc9573a60d3cfc02b2`. The API's `lib/artistLinks/__tests__/fixtures/0056_catalog_disconnect.sql` must match byte-for-byte; update both only after review and rerun both suites when the DDL changes.

The bounded #1595 row H client change moves `directEditLink` and `removeArtistData` to the existing authenticated API and removes those two Web routes. The rest of row H, external MCP cutover, and API #85's source migration remain their owners' work. No setting, credential, or infrastructure addition is required.

## New security capability requiring approval

The migration creates a dedicated `musicnerd_private` schema and `catalog_link_disconnects` archive, and a SECURITY DEFINER `disconnect_catalog_link(uuid,text,text,jsonb,uuid,uuid,text)` function. It grants backend `mnweb` only schema USAGE and function EXECUTE. It grants no archive SELECT/INSERT/UPDATE/DELETE, no general active-mapping DELETE, and no PUBLIC/anon/authenticated execution or schema access. Existing public-table RLS and grants are not expanded.

The function's trusted DDL owner supplies its narrowly scoped archive/DELETE authority. Fixed `pg_catalog, pg_temp` search_path and fully qualified relations prevent object substitution. Actor and claim identifiers are immutable historical snapshots without foreign keys that could destroy history or block claim revocation. Original mapping attribution remains private. The caller's actor is established by Privy in the trusted API, not independently authenticated by PostgreSQL or `auth.uid()`.

Do not apply through an application role, broaden grants to make a failure pass, or use direct owner SQL as a substitute for the authenticated application operation. The function deliberately verifies actor, current role/claim generation, direct value, and full mapping snapshot again under locks. Divergent or retained mappings with a blank direct slot fail for targeted review.

## Approval and deployment order

1. Review the exact migration hash, source diffs, app-role integration results and privilege tests. Confirm the repository's next migration entry is still 0056 and no other branch has claimed that sequence. Reconcile current main and Sweetman's migration contracts before publication/release.
2. Request explicit action-time approval for creating the schema/table/function and granting this backend EXECUTE capability in the intended database. General code publication approval is not this approval.
3. After approval, use the established manual whole-file production protocol for this Web-owned migration. `db:migrate` and full-chain replay are prohibited until the separately tracked #1148 journal drift is reconciled. Preflight read-only: correct database and trusted DDL owner; required public relations/columns and existing mnweb role; private schema must be absent and this exact capability must not already be applied. A pre-existing schema is a hard stop, not permission to revoke another schema's access.
4. Manually apply **only the entire reviewed 0056 file**, including its BEGIN/COMMIT, on one reserved privileged connection. Do not invoke `db:migrate`, replay the migration chain, or wrap this file in an outer migrator transaction. Never execute creation and PUBLIC revoke separately. If a statement fails, explicitly ROLLBACK and inspect; do not continue in an aborted transaction. Record the exact applied file hash and owner separately from historical journal reconciliation; this task does not authorize journal repair or journal writes. A partial or uncertain execution requires read-only inspection before any retry.
5. Read-only postchecks: private table RLS enabled; no archive app/browser grants; `has_function_privilege` false for PUBLIC-derived anon/authenticated and true only for intended backend; fixed search_path, SECURITY DEFINER and trusted owner; existing public policies/grants unchanged. Verify the new schema/function matches the approved file. Repository metadata consistency and the pre-existing live journal drift are separate records; do not claim the live journal was repaired. Do not use a production artist as a write probe.
6. Deploy API through the normal reviewed PR/main workflow, verify exact SHA and safe health/unauthenticated checks. Deploy Web only against the compatible API after that succeeds. For draft previews, pair the Web branch-specific API URL with that exact API preview; metadata pairing is not a proven authenticated runtime hop.
7. Any state-changing deployed acceptance must use an explicitly authorized test record or isolated fixture; none is currently authorized. Local SQL tests do not establish deployed Privy/browser acceptance. Safe authenticated negative checks can be performed without fixture writes when a suitable session is available. No shared staging submission, arbitrary production target, provider search, or paid call is authorized by this packet. Report unperformed acceptance plainly; do not close #1580's broader criteria prematurely.

Before the migration, the new API returns an explicit unavailable response with no legacy clear fallback. Generic transaction errors say the disconnect could not be confirmed and require refresh before retry, because connection loss during COMMIT can be uncertain. Definite SQL errors roll back archive, active removal, direct clear and job cancellation together.

## Compatibility and rollback

Owner clear accepts the displayed `expectedValue` and current claim generation; contributor clear retains whitelist/admin semantics with a fresh role/claim check. Legacy name-only onboarding removals of Spotify/Deezer stop with a profile-editor instruction before changes or advancement. MCP catalog deletion returns `OWNER_DISCONNECT_REQUIRED` after API-key authentication; API keys do not gain owner authority. Noncatalog behavior is preserved. Build reset preserves both catalog accounts and mappings.

Ordinary disconnect creates no exclusion: future explicit valid replacement or independently corroborated rediscovery remains possible. Latest snapshots remain retained evidence but are ineligible while disconnected or when their old account differs from the new account.

If code must be rolled back, preserve the archive and migration; never drop history as a rollback shortcut. Older code can again leave stale mappings, so choose a safe compatible rollback/disabling strategy with the owner rather than silently reverting one side of the paired clients. Do not revoke backend EXECUTE while the dependent code is still serving successful disconnects unless deliberately disabling that operation and accepting its explicit failure.

## Targeted recovery contract

Archive retention makes recovery possible; it is not an automatic undo policy or a shipped restoration API. A separately authorized operator recovery must select one exact event and full DB-derived mapping snapshot, lock artist/platform then destination identity then artist, and require: direct slot empty, no newer own mapping, no other artist holding the direct or mapped destination. Refuse any mismatch. Restore the exact original mapping only when the archive actually contains one, restore the direct value atomically, and retain the archive event. Never use ON CONFLICT overwrite, fabricate a missing mapping, replay old jobs, erase exclusions, or restore unrelated artist state.

The local migration test rehearses this contract for full/no mapping snapshots and refuses newer direct/own mapping/other-owner collisions with full rollback. It leaves jobs, archive, exclusions, snapshots and prior audit unchanged. This procedure is not permission to execute recovery on a live artist.

## Recorded verification

- `scripts/migrations/catalog-disconnect.test.mjs`: 24 PGlite cases, actual migration with representative app RLS/ACL, both catalog platforms, full snapshot/CAS/auth, atomic failures, empty-slot cancellation, pre-existing namespace refusal and targeted recovery. Included in CI's node test step.
- API local authenticated-context integration: real handlers and authorization rechecks with mocked authentication-token verification, URL extraction and notifications; private primitive under mnweb, actual replacement writer/collision guards/self-edit audit, nonempty old Latest snapshot eligibility, role/claim changes, missing EXECUTE and rollback.
- Web client tests: authenticated bearer URL routing, displayed-ID expectation, errors and unchanged noncatalog/source paths. Reader history/feed/RLS/pagination tests remain after deleting old endpoint tests.
- Existing opt-in local PostgreSQL regressions preserve actual concurrent worker/disconnect lock contention and empty-slot cancellation; record their separate execution result rather than treating default skips as passes.
- No live migration, grant, artist write, provider call, or shared fixture mutation is part of these local checks.
