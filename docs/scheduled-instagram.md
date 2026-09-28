# Scheduled Instagram updates

Implementation for #1376. Not enabled or deployed by creating this code.

## Contract

The daily authenticated cron `/api/research/instagram-refresh` queues at most ten
`social_ingest` jobs marked `scheduledInstagram: true`. Only approved claimed artists
with a valid current Instagram handle and existing own Instagram posts qualify. The
least recently scheduled artists go first; no artist is scheduled more than once per
UTC day. This avoids skipping a day when cron arrives a few seconds earlier than
yesterday. Existing active ingest/extraction work takes priority.

Each check requests at most nine posts from Apify, with a cutoff equal to the newer
of seven days ago and the newest stored own post minus 24 hours. This overlap catches
late results and pins without a full-history backfill. The collector additionally
bounds the returned results, filters old/foreign posts and reuses the existing upsert
and retained-thumbnail path. More than nine new posts, pinned results consuming slots,
provider errors and gaps longer than seven days can leave omissions; there is no
unbounded catch-up. No deletion detection is promised.

The existing minute worker advances these jobs. They finish after collection, with
no caption extraction, Lore rebuild or bio regeneration. A new stored post is visible
on the next profile load; an already-open page does not live-update. With ten or fewer
eligible artists the target is daily collection plus worker/provider delay. Larger
cohorts rotate under the same budget, so freshness gets slower instead of costlier.

## Spending protection

Each queued job reserves 3 cents in `instagram_refresh_reservations`, atomically with
the job insert under a shared transaction advisory lock. At most ten reservations
per UTC day and 1,000 cents in the trailing 32 days are allowed. The 32-day window
also covers a job that starts up to 24 hours after reservation; it conservatively
bounds launches in any 31-day month. Unused reservations are not refunded. Failed
attempts and deleted research jobs still consume their reservation. Budget records
have no cascading foreign keys and the app cannot delete them.

Apify receives `maxTotalChargeUsd=0.03`, `maxItems=9`, `timeout=180`, and
`restartOnError=false`. A durable start marker is written before the paid request.
If its response or run-ID persistence is lost, that reservation never launches
again; freshness is sacrificed rather than risking repeat paid runs. Polling and
collection retries reuse the saved provider run. Revoked claims, changed handles,
expired reservations and missing configuration cannot start paid work.

This is a cap on these scheduled Apify runs, not the entire Music Nerd bill. Existing
onboarding/manual research, hosting and storage have separate costs. Nine posts at
the published free-plan $2.70/1,000 rate are about 2.43 cents before any pricing changes;
provider caps, rather than that estimate, enforce run spending. Thumbnail work is
bounded to at most 90 post results daily and reuses already retained images.

## Rollout

Apply migration 0031 and verify `mnweb` SELECT/INSERT/UPDATE and denied DELETE on the
reservation table, plus denied access for anon/authenticated. Do not replay historical
migrations. Deploy with `INSTAGRAM_REFRESH_ENABLED` unset (disabled). Enable it as
`true` only in the intended production environment after reviewing a bounded canary.
The scheduler requires both `CRON_SECRET` and `APIFY_API_TOKEN`; missing cron auth
returns 401 even locally. Turning the flag off also cancels queued scheduled work when the worker next sees it, without
starting or collecting. Reservations remain spent. No page view initiates scraping.

Monitor the cron response and research-job status. The reservation ledger records
reserved time, started time and run ID; do not delete it to retry or reclaim budget.
A failed ambiguous start waits for the next daily attempt. Scheduled checks do not
alter the existing manual Look again flow.

## References

- [Issue #1376](https://github.com/xdjs/MusicNerdWeb/issues/1376)
- [Apify Instagram input](https://apify.com/apify/instagram-scraper/input-schema)
- [Run API limits](https://docs.apify.com/api/v2/actors-runs-post)
- [Instagram pricing](https://apify.com/apify/instagram-scraper/pricing)
