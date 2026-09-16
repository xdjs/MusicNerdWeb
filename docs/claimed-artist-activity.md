# Claimed-artist link activity (#1134)

Pete confirmed team approval on September 15, 2026: additions and updates to a
claimed artist's own links appear in public activity and separately in account
history, without competitive contribution credit. Unchanged saves emit nothing;
removals stay out of the public feed. Removal-history policy remains deferred.

## Write contract

`POST /api/directEditLink` retains authentication, platform parsing, conflict checks,
and the ownership generation check inside the artist-row lock. A changed link and
its `artist_self_edits` event commit in the same transaction. The event identifies
the authenticated approved claim owner, artist, platform, previous/new value, and
submitted URL. Non-owner administrator maintenance is not classified as a self-edit.
The timestamp is the successful edit time. Concurrent identical saves serialize on
the artist row and produce one event; a failed event insert rolls back the link.
No-op saves, removals, denied requests, and failed writes create no event.

## Read contract

The homepage feed includes `self_edit_added` and `self_edit_updated` events, labeled
as artist self-edits. Polling and the existing global limit apply to all sources.
The signed-in profile displays a separate **Your profile edits** history with a
**No leaderboard credit** explanation, newest first and paginated. The server derives
the history owner from the authenticated session; request parameters cannot select
another account. Existing community contribution history and totals remain unchanged.
Self-edits never create `ugcresearch` rows, so existing leaderboard queries and
contribution totals do not count them. No historical edits are reconstructed.

## Schema and release

Add the table, activity-time and owner/time indexes, foreign keys and nonempty/changed
value checks in the new Drizzle migration. Enable RLS, grant only SELECT/INSERT to
`mnweb`, and revoke client-role access. The trusted server role enforces account
isolation in application code; public activity exposes no actor ID or submitted URL.
Apply only this migration to the verified staging database before preview/merge.
Verify grants and policies as `mnweb`, and denied client-role access. Production
requires the same migration before the next release; do not replay old migrations.

## Verification

Database-backed route tests cover additions, updates, repeated and concurrent saves,
removals, failed writes, non-owner administrators, revoked/unauthorized users, private
history and leaderboard exclusion. Component tests cover event copy and separate
history with loading, empty/error states and pagination. Run full CI and check the
exact-commit preview on desktop/mobile in both themes. Never submit real suggestions
from the staging add-link modal; disposable database fixtures supply write evidence.

### Local concurrency reproduction

`scripts/verify-self-edits-local.ts` provisions a **fresh, disposable** localhost
Postgres database named `self_edit1134` and invokes twelve simultaneous identical
writes through the real service as `mnweb`. Run with
`SELF_EDIT_LOCAL_OWNER_URL=postgres://<local-owner>@127.0.0.1:<port>/self_edit1134`
and the documented stub build variables using `npx tsx scripts/verify-self-edits-local.ts`.
It refuses remote hosts and other database names. Use a disposable cluster: the
script creates fixture roles/schema and leaves fixtures for local browser checks.
