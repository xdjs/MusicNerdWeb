# Lore submission approval

October 5, 2026 — Pete requested immediate approval for whitelisted contributors
after CY encountered the artist-review message. Tracked in [#1423](https://github.com/xdjs/MusicNerdWeb/issues/1423).

New, direct Lore URL submissions use the account's current `users.is_white_listed`
or `users.is_admin` value, read on the server at submission time. Either role saves
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
