# Artist questions in Edit profile

Tracking: [Web #1422](https://github.com/xdjs/MusicNerdWeb/issues/1422) and
[shared API #1424](https://github.com/xdjs/MusicNerdWeb/issues/1424).

## Accepted design — October 7, 2026

Pete reviewed the local prototype in the actual artist profile and authorized a
reviewed production PR. Edit profile remains the entry point. Lore contains
**Lore → Questions → Bios**, in that order, with Lore initially selected. The
Lore and What we know about you headings are collapsible, with matching chevrons
at the far right. Approved sources are searchable and paginated; adding a source
is a separate disclosure. Questions must not sit below a long source list.

The reviewed prototype distinguishes listener questions from the artist's own interviews.
This PR implements the interview view using existing saved answers. Listener sharing
is still a scope decision under #1422; no listener records are collected or displayed
as invented activity. The listener view needs authoritative delivered exchanges,
explicit sharing and withdrawal before it can ship.
Interview review shows the exact question and saved response, an inline editor,
and collapsed version history. Switching views preserves unfinished edits.
Readable controls and keyboard operation are required in both themes and at
390px phone width. Bios retains the existing real version/pin controls.

## Production data boundary

The disposable prototype's LATASHÁ snapshot, invented exchanges, localStorage
drafts, owner simulation, disabled APIs and middleware are excluded from this
change. The public profile continues to use its existing data and authorization.
Only the authenticated current claimant or administrator can review private
interview records or save revisions. Each request is authorized by MusicNerdAPI;
visibility in Edit profile is not authorization.

Interview records remain in the shared API. A revision must preserve the exact
original question, answer, source, sitting and offer time; reject a stale edit;
retain earlier wording with stable references; and make the saved current answer
available to existing permitted knowledge consumers. A failed save must keep the
artist's draft, and a failed read must never look like an empty interview.
Version history starts from retained data; earlier unrecorded edits cannot be
reconstructed. Existing generated bios are not silently replaced by editing a
response.

Listener history is not currently persisted as authoritative delivered exchanges.
The implementation must not manufacture historical activity from research jobs
or logs. Any new sharing flow needs explicit listener choice and clear retention,
withdrawal and artist-access behavior before capture is enabled.

## Verification and release

Exercise real claimant/admin reads and writes, anonymous/unrelated/revoked-account
denials, save/reload, concurrent edits, exact old/current references, failure
recovery and cross-artist navigation. Check source filtering/pagination and bio
controls as well as the new interview editor. Run the repository CI gates and
verify the exact deployed preview, both themes, desktop and phone. Migration and
actual app-role checks precede dependent API publication. Required review precedes
merge; Web production uses the protected release workflow and a separate
production-config build. Main merge alone is not production.

## API dependency

Contract: [Docs #9](https://github.com/xdjs/MusicNerdDocs/pull/9). Persistence and
authenticated review: [API #26](https://github.com/xdjs/MusicNerdAPI/pull/26).
[Web #1445](https://github.com/xdjs/MusicNerdWeb/pull/1445) owns migration 0043
and guards old Web submissions before the API publishes.

The UI reads five answers per page via `/api/artist/{id}/interview/responses`,
retains unfinished edits across tabs/pages, and registers them with Edit profile's
Done action. A stale edit preserves the draft and requires reviewing the new saved
wording before retrying. Version reads resolve exact revisions, not a regenerated
summary. Save queues a durable Lore refresh; generated Lore can remain stale until
the worker finishes. Existing bios remain explicitly managed in Bios.
