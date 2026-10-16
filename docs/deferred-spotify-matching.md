# Deferred Spotify matching

October 15, 2026 — Pete approved opening a new artist immediately and completing a missing Spotify identity later, including after Spotify's rate limit clears. Tracks MusicNerdWeb #1524.

## Creation and ownership

The successful new-artist transaction records one `directory_add` activity. It queues the existing `source_search` independently, plus one `spotify_match` job only if the inserted record has a Deezer ID and no Spotify ID. The job snapshots the Deezer ID and name and references the same creation activity. A rollback commits neither the artist nor either job. Existing-artist responses do not enqueue duplicate work.

The API's existing research runner owns matching; opening a page does not queue or restart it. The job stores `version: 1`, `purpose: spotify_identity`, `deezerId`, `artistName`, `creationActivityId`, and `directoryActivityId`. It can checkpoint ISRCs, matches and `nextAttemptAtMs` between invocations. It must recheck the artist's current identities before saving and leave manual links untouched. Explicit Spotify/Deezer edits or removals cancel pending matching inside the same locked transaction, including remove-and-restore sequences. A claim alone does not invalidate this public directory identity job; it grants no Lore or private-source authority. Matching names alone are insufficient for automatic attachment; distinct recording evidence and unambiguous artist identity are required. Ambiguous results remain reviewable.

## Shared Spotify cooldown

Migration 0050 adds the job kind and a server-only `provider_request_cooldowns` table. The key is `spotify:` followed by SHA-256 of the Spotify client ID. Web and API using the same credential therefore share a deadline across server restarts and concurrent instances. Neither the credential nor bearer token is stored. Sharing is within the same database; environments sharing a provider credential need the current observed deadline seeded in each database when this protection is first enabled.

Every uncached authenticated Spotify request checks this deadline first. A 429 records the provider's `Retry-After`, accepting seconds or an HTTP date. Missing or invalid values use a 60-second delay. Concurrent writes retain the later deadline. Provider-specified delays are never shortened. A shared-store failure stops the request instead of ignoring an unknown cooldown. Public Spotify oEmbed is separate from the authenticated catalog API.

The API job defers until the deadline without burning its failure-attempt budget or replaying source research. It uses bounded retries for real failures and persists its progress before yielding. Tests must cover restarts, overlapping workers, no requests during cooldown, eventual verified attachment, conflicting owners and changed artist identities.

## Release order

Apply migration 0050 to staging, then pair the Web enqueue/cooldown preview with the API runner preview. Verify the real handoff plus controlled provider outcomes without hammering Spotify during a live limit. Apply the migration to production before promoting the paired implementations. Navigation PR #1526 and verified-hub guard API #44 are independently scoped; they do not complete deferred matching.

The bounded new-profile observer includes the Spotify matching job, so finishing source discovery does not stop link updates before a pending match finishes. Its existing ten-minute observation window still applies; matches that finish later appear on the next page load.

## Cached Web lookups after cooldown

October 16 follow-up to #1524: artist, image and catalog-name caches store only
successful provider reads. Temporary failures are translated to the existing
caller-facing fallback outside the cache. Albums and top tracks cache separately,
so one successful half remains usable while the failed half can recover on the
next lookup. Legitimate successful empty catalogs/images remain cacheable.
Versioned cache keys bypass empty results saved by the previous implementation;
existing cache tags remain valid. No database migration or new research is needed.
The single-artist `getSpotifyData` route also handles token-acquisition cooldowns:
it returns HTTP 503 with Retry-After and no-store, rather than an uncaught 500.
Other acquisition failures use the existing 502 shape and are not cacheable.
