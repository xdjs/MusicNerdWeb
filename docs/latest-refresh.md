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

The worker refreshes In Process and each linked Spotify/Deezer catalog independently,
using artist/provider-specific cache tags. Published interview answers are reread from
Music Nerd. Instagram collects at most nine recent own posts within the last thirty days,
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
MusicNerdAPI currently claims only social_ingest/caption_extract/lore_refresh; this new
kind remains served by MusicNerdWeb's existing worker and cron. The API cutover (#1365)
must preserve that worker for source_search/latest_refresh or port both before deleting
it. Migration 0034 follows the username migration 0033.

## Verification contract

Test real PostgreSQL request coalescing/cooldowns and ownership; anonymous/non-owner
routes; collector bounds and no generation; lost provider start; partial failures and
resume; all source results; UI 390/832 in both themes and reload/navigation. Local mocks
are not proof of live provider behavior. Apply staging SQL and execute a bounded real
provider check only with an explicitly identified staging artist; production separately.

## Refresh reliability — October 1 (#1408)

A failed status request is not proof that the paid Instagram run failed. Retry
transient status and dataset reads against the saved run/dataset using the queue’s
existing four-attempt limit. Never issue another paid start for that request.
Known nonterminal provider states remain pending; a confirmed failed, aborted or
timed-out run ends the Instagram check. Store safe failure codes privately on
the job for diagnosis, without provider response bodies, tokens or URLs.
The editor continues to receive only source status and checked time.

Thumbnail retention preserves the working CDN fallback and existing retained
images. Verify the failed image’s format and the bounded download/conversion
path before changing acceptance or retry behavior. Keep byte/pixel limits,
allowed hosts, refused redirects and job-scoped revocation cleanup intact.

Implement equivalent worker behavior in MusicNerdAPI before the Web worker is
removed by #1405; the API cutover must not restore the failure behavior. This
change introduces no new endpoint or schema. Provider verification reuses saved
results where possible; local injected failures are not evidence of a paid live
scrape. No additional scrape or production data changes are part of development.
