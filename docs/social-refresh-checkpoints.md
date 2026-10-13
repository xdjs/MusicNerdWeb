# Social refresh checkpoints

Tracks [#1496](https://github.com/xdjs/MusicNerdWeb/issues/1496).

Migration `0048_social_refreshes.sql` adds private scan state for MusicNerdAPI.
It follows `0047_private_directory_preparation.sql` from PR #1493; this schema
change is stacked on that PR and must not be treated as an independent journal.

Each artist, platform, normalized connected account, and scan scope has its own record.
Instagram Latest uses `latest`; broader account research uses `profile`. A recent
30-day Latest check cannot suppress an initial broader profile baseline or
advance its coverage. Other platforms support only `profile`.
`scan_started_at`, `checked_at`, `item_count`, and `run_id` identify the latest
successfully collected profile scan. `status` distinguishes a complete bounded
scan from one limited by its collection budget. `covered_through` is nullable:
limited scans can preserve an earlier safe boundary without inventing coverage.
A complete scan requires a non-null boundary. It cannot exceed the new scan's start time. Targeted post reads must never advance
this account checkpoint. Historical archive completeness is not implied.

`scan_reference` defaults to an empty JSON object. The API validates its `anchors`
array of `{id, postedAt}` and nullable ISO `gapSince`; the database enforces the
outer object shape. Anchors must come from guarded account scan results, never
arbitrary externally added or targeted post rows. This permits recent-feed
continuity tracking without treating a partial result as historical coverage.

The table survives research job replacement and is deleted with the artist.
Claim revocation clears every account and scope checkpoint in the same guarded
transaction that removes social posts, so a new claimant starts without stale
coverage or cooldown.
Only the server role `mnweb` has CRUD grants and RLS policies; public and
authenticated browser database roles have no access. Application workers remain
responsible for checking current artist/account authorization and atomically
writing checkpoints after successful collection. This schema adds no scraper,
scheduled job, user-facing control, or public API response.

Apply the migration before deploying dependent API workers. Verify actual CRUD
as `mnweb`, plus denied browser-role access. The PGlite migration test exercises
those permissions, identity/date/count constraints, compound uniqueness, and
artist deletion. Snapshot parity guards the complete Drizzle schema.
