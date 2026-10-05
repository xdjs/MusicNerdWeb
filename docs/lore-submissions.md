# Lore submission approval

October 5, 2026 — Pete requested immediate approval for whitelisted contributors
after CY encountered the artist-review message. Tracked in [#1423](https://github.com/xdjs/MusicNerdWeb/issues/1423).

New, direct Lore URL submissions use the account's current `users.is_white_listed`
or `users.is_admin` value, read and locked inside the source-insertion transaction.
A completed revocation saves the source pending; a concurrent revocation waits
for that insertion to finish. Either trusted role saves
the source as `approved`, on claimed and unclaimed profiles. Other contributors
continue to submit `pending` sources. Session flags and request-body flags never
authorize approval. Failed role lookups fail the submission before writing.

The public profile's **Add a Lore source** dialog explains automatic approval to
trusted contributors. Ordinary visitors retain **Suggest a Lore source** and the
artist/admin review explanation. The success message follows the status returned
by the server, so a role change after loading the page cannot falsely claim approval.
Approved submissions refresh the profile's source list immediately.

The editor's existing URL action follows the same role rule. Artist owners without
either trusted role retain their existing review step. File uploads remain approved
and restricted to existing artist owners/admins; whitelist membership alone does not
grant upload, edit, delete, research, or moderation access.

Both URL entry points retain URL validation, canonical duplicate checks, source
origin and contributor attribution. A duplicate is a conflict, including a previously
pending or rejected source; resubmitting never changes its status or contributor.
This does not approve a historical backlog or automatically accept scraped research.

Approved additions queue the existing coalesced `lore_refresh` job with the current
claim generation and submitting account. MusicNerdAPI rebuilds derived Lore from
saved sources; this change starts no fresh social scrape. A queue failure leaves the
approved source visible and returns a warning instead of encouraging resubmission.
Existing artist/admin moderation can still reject the source.

Data path: `ArtistProfileContent` → `VaultSection` → `SuggestLoreSource` →
`POST /api/artist/[id]/lore-suggestions` (or editor `addVaultSource`) →
`insertVaultSource` + activity → approved source reader + `queueLoreRefresh`.
No schema, grants, RLS, or external integration changes are required.

Verification covers live database roles rather than session claims, duplicate and
rejected-source protection, attribution, public reads, queued work, and both UI
confirmation states. PostgreSQL fixtures exercise the real route/query path without
modifying real artist data or running paid research. Preview and review evidence
belong on the PR; implemented, merged, and deployed are separate states.

## Contributor bulk review

Admins can open **Bulk approve** from a selected contributor's history. The
dialog loads that account's pending direct Lore submissions/uploads and link suggestions across pages,
shows the source titles and artists, and asks for confirmation of that exact set.
The preview includes up to 200 submissions, regardless of the history's
current filters. Scraped research, unknown origins and completed reviews are
excluded. Further previews remain available if the contributor has more. Pete
explicitly chose both Lore and links for this action on October 5.

The server validates the selected contributor and source IDs, checks the current
admin role again inside each write transaction, and updates only still-pending
direct submissions attributed to that contributor. Concurrently reviewed rows are
skipped, and new submissions arriving after confirmation are not included. Each
approval records the reviewing admin while retaining the original submitter.
Approvals run in requests of ten to bound serverless work. Lore takes the same
artist-before-source locks as individual moderation. Links reuse the shared
normalization and platform identity conflict checks inside the same transaction
as their pending-state check and approval. Each item commits independently;
failed items stay pending and do not undo successful items. The existing Lore
job is queued once per affected artist per request. Results report approved,
skipped and failed counts plus any derived-refresh warning. A queue failure does
not pretend saved approvals failed. No emails or Discord messages are sent.

Pete's October 5 request to approve Tempo Menace's existing submissions needed no
production writes: the production inventory already showed 4 approved attributed
Lore sources and 566 approved links, with no pending submissions.

## Selected sources in the Lore queue

Pete also requested selection across artists and contributors in **Admin → Lore**
on October 5. Each pending source has a checkbox. **Select all on this page**
selects only the displayed page (up to 25 sources), with a partial-selection state
and a way to clear it. **Approve selected (N)** opens a confirmation showing the
selected sources' titles, artists and URLs. Cancel makes no writes. Individual
Approve and Reject remain available. Changing page, search, origin or claim filter
clears selection; refreshing the same page cannot add new arrivals to it.

The confirmation freezes the exact selected IDs and processes requests of ten.
Only a current Admin can use this action; each source-write transaction locks and
rechecks the admin role and updates only a still-pending source. Manual selection
can include research, uploads and unknown-origin sources. The contributor bulk
action continues to require direct submissions from its chosen contributor.
Both paths reuse the same pending-Lore write, artist-before-source lock order,
original attribution, reviewer activity and coalesced Lore refresh jobs.

Results identify approved, skipped and failed IDs. Approved and already-reviewed
rows leave the local queue; failed rows remain selected for another review.
An interrupted request has an unknown outcome: refresh before retrying, and any
already-reviewed source will be skipped. Buttons prevent duplicate submissions
while a request runs. Enqueue failures warn without misreporting saved approvals.
No schema changes, notifications or new scraping are introduced.
