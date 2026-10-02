# Manual Latest refresh

September 29, 2026 — issue #1376. Pete approved one **Update Latest** action for all
supported connected sources, replacing the proposed scheduled Instagram rollout.

During preview review, Pete requested that this control live inside Edit profile.
The artist/admin sees the action in Latest only while Edit profile is active. A POST is
explicit, authenticated and checked against live artist ownership. The request records
its initiator in Admin activity and creates a `latest_refresh` job in the existing queue.
A per-artist lock coalesces concurrent requests and enforces a thirty-minute cooldown.
GET only reports saved job status; page reads never enqueue work. Each progress write
rechecks ownership and all connected identities under the artist lock. Results and
cooldowns from an obsolete scope are ignored; a new request cancels the obsolete live
job before queuing a refresh for the current connections.

The request checks In Process and each linked Spotify/Deezer catalog independently and in
parallel, using artist/provider-specific cache tags (`checkLatestSources`), outside the artist
lock. Published interview answers are reread from Music Nerd. These checks stay in this app
because they expire its own cache. The queued job carries only the Instagram check, which
MusicNerdAPI runs (#1365); with nothing for Instagram to do, it is saved as done. Instagram collects at most nine recent own posts within the last thirty days,
retains thumbnails through the existing collector and never queues extraction or Lore.
Provider-start intent is persisted before the paid POST; a lost response is terminal for
that request rather than a second paid run. Instagram is capped at $0.03 per run. Repeated
requests during the cooldown reuse the existing result, including failures.
Latest and social research share the artist lock: if social ingest is already live,
Latest skips its Instagram check; if Latest is checking Instagram first, social ingest
is not queued and Look again explains that it must wait. Other Latest sources still run.

Results identify each source as checked, unavailable, not connected or still checking.
No claim of new-item counts is made from upsert counts. Successful checks invalidate only that connected identity’s cache; cards repaint through
router.refresh. In Process and catalogs are checked directly before invalidation, so a
failed check leaves existing cache entries intact. The next read fetches again; a second
upstream failure at that point still uses the existing public-read fallback. This costs
one extra bounded read per successful manual source check.
No About/Lore rebuild or interview generation is triggered. X/TikTok are not yet supported.

## Migration and API cutover

The queue constraint must allow `latest_refresh` before code runs. No new table/grants.
Migration 0034 follows the username migration 0033.

September 30, 2026 (#1365, Sweetman): MusicNerdAPI runs `latest_refresh` (API 1d,
MusicNerdAPI#13): its Instagram check, with the ownership and identity check before every
slice. The edit-mode pump posts to MusicNerdAPI's `/api/research/advance`. This app's worker,
`/api/artist/[id]/latest-refresh/advance` and its cron are gone.

## Verification contract

Test real PostgreSQL request coalescing/cooldowns and ownership; anonymous/non-owner
routes; collector bounds and no generation; lost provider start; partial failures and
resume; all source results; UI 390/832 in both themes and reload/navigation. Local mocks
are not proof of live provider behavior. Apply staging SQL and execute a bounded real
provider check only with an explicitly identified staging artist; production separately.

## Refresh reliability — October 1 (#1408)

A failed status request is not proof that the paid Instagram run failed. Retry
transient status and dataset reads against the saved run/dataset using the queue’s
existing four-consecutive-failure limit. A successful provider poll resets the
allowance; merely rereading a cached dataset does not, so persistent collection
failures still terminate. Never issue another paid start for that request.
Known nonterminal provider states remain pending; a confirmed failed, aborted or
timed-out run ends the Instagram check. Store safe failure codes privately on
the job for diagnosis, without provider response bodies, tokens or URLs.
The editor continues to receive only source status and checked time.

Thumbnail retention preserves the working CDN fallback and existing retained
images. Temporary download/upload errors retry once at the same immutable path
within the existing shared nine-second deadline. Diagnostic logs identify the
download, decode or upload phase using fixed reasons, never media URLs or raw
exceptions. The reported missing thumbnail currently returns a valid JPEG; its
original failure reason was not retained, so a format defect is not established. Keep byte/pixel limits,
allowed hosts, refused redirects and job-scoped revocation cleanup intact.

October 2: #1405 has removed the Web worker. MusicNerdAPI#15 owns the retry
and retention behavior, integrated with Sweetman’s current API main and its
killed-lease accounting. Web only queues Latest and reads safe source status;
its remaining ingestion helpers retain the same thumbnail protections. This
change introduces no new endpoint or schema. Provider verification reuses saved
results where possible; local injected failures are not evidence of a paid live
scrape. A bounded staging refresh may verify the paired deployments; production changes
require separate release approval.

The retry also accepts Supabase's current and legacy already-existing-object
responses for the same content-addressed path; it never enables overwriting.
Provider lifecycle and error contracts: [Apify run states](https://docs.apify.com/actors/development/builds-and-runs)
and [Supabase Storage errors](https://supabase.com/docs/guides/storage/debugging/error-codes).

## Paired API previews

A Web preview can target an unmerged API preview with
`NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL`. Set it only for the feature branch or
individual preview build after confirming the API uses staging data. With no
override, previews and local development use the shared staging API. Production
always uses the production API and ignores this override. This lets us verify
the actual queue → API worker → saved status flow before merging either side.
