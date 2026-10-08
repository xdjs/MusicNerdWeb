# Interview response version storage

Refs [#1422](https://github.com/xdjs/MusicNerdWeb/issues/1422) and [#1424](https://github.com/xdjs/MusicNerdWeb/issues/1424).

This additive migration supports private interview response review in Edit profile.
MusicNerdAPI owns authorization and writes. This PR renders nothing on its own. It also guards the existing Web interview submit path: already answered questions accept only byte-identical retries, so a stale submit or skip cannot overwrite a response revision.

`artist_interview_answer_versions` retains exact response snapshots by answer ID
and the same stable revision used by shared knowledge history. It stores an optional
edit note and actor attribution separately from the artist's exact answer. The API
archives old and new wording atomically with the current answer and Lore refresh request.
No fabricated historical backfill is performed.

RLS is enabled. Only the server app role `mnweb` receives SELECT and INSERT; browser
roles receive no grants. The current claimant/admin is checked by the API for every
read and edit. Role-wide RLS is not per-user authorization. Archived rows cannot be
updated or deleted by the app role. Removing the parent answer/artist cascades.

Migration `0043_interview_response_versions` avoids numbers 0040–0042 already reserved
by draft #1441. It is independent of those pending changes. The journal entry and
snapshot are included together; `drizzle-kit check` accepts the reserved gap. This does
not reconcile historical manual migration drift (#1148); never replay all migrations.
Rebase #1441's snapshots/journal when it is prepared for merge.

Apply only this migration to the independently verified staging target, verify grants
and RLS as `mnweb`, and test the API there. Apply and verify it in production after
review and and release the guarded Web submit path before publishing the dependent API. Web's protected production pipeline
never executes DDL. Preserve exact applied SQL and record each environment separately.
