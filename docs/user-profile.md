# User profile delivery contract

The regular `/profile` requires a real MusicNerd session. It renders the approved contribution-first design with account data, never preview fixtures. `/profile?preview=concept` is a separate development/Vercel-preview demonstration with in-memory edits.

## Data and behavior

- Identity comes from the session-owned user endpoint. Name edits reuse its validated PATCH. Photos use the private `user-profile-images` bucket, per-account paths and server-issued signed URLs.
- Impact reports accepted UGC and pending UGC under the existing moderation semantics; self-edits remain separately visible and never count as leaderboard credit. Recent rows and full history preserve canonical artist IDs and dates.
- Bookmarks are an explicit account-owned relationship. Browser entries are imported without replacing existing remote bookmarks; migration must not resurrect deliberately removed bookmarks on later devices. No contribution creates a bookmark automatically.
- Added/contributed artists can be suggested when a collection is empty, with explicit Bookmark actions.
- Latest shows existing published content for bookmarked artists only, bounded and sorted by date with clear partial-failure handling. It triggers no scraping or new research. Listening destinations and source attribution use the artist-profile components.
- Search, bookmark, remove, profile edit and failure recovery work without a hard reload. The profile remains useful if Latest or photo loading fails.

## Release verification

Verify anonymous rejection, two-user isolation, cross-device bookmarks/photos, browser import idempotency and removed-bookmark behavior; name/photo failure states; actual counts versus history; preservation of self-edits; search-to-bookmark and remove on both surfaces; empty and populated collections; mobile and desktop light/dark; existing artist-card expand/listening flows. Apply only the owned schema/storage prerequisites, verify as `mnweb`, and keep production unchanged until its separately approved release.

## September 16 integration status

Migration `0028_famous_captain_britain.sql` was applied to the staging data environment before application delivery. Verified through its `mnweb` connection: RLS enabled, bookmark CRUD allowed, anonymous role denied, and self-edit reassignment restricted to `user_id` (content updates denied). The private photo bucket accepts WebP up to 2 MB. Migration-history reconciliation remains the separate #1148 work; this is not authorization for automatic migration replay.

Photo requests resolve the current database identity on every request and use a hashed Privy identity key where available, with the surviving account’s legacy path as an absent-object fallback. Profile query requests assert the expected account and validate response ownership. Self-edits and artist additions are recognized separately from approved contribution credit.

### Database connection budget

The shared Postgres.js app client uses at most three connections per process and closes idle sockets after 20 seconds; connection setup times out after 10 seconds. This limits the new profile’s concurrent summary/feed footprint after preview verification exposed staging session-pool exhaustion. It does not impose a project-wide limit or a query deadline. Existing deployments and development singletons keep their old pools until retired/restarted; do not terminate unrelated sessions. Transaction-pooler migration is a separate infrastructure decision. See [Postgres.js connection options](https://github.com/porsager/postgres#connection-details).

### Artist photos

Suggested and saved artist images load independently of account data. When no image is supplied, `/api/artist/[id]/image` resolves the artist's custom upload first, then the existing Deezer/Spotify image provider used by artist profiles. Successful redirects cache for one hour; missing/provider failures retain the tile's fallback and do not block profile loading or bookmark writes. This public route returns only an existing public artist image, never account data, and does not generate or scrape content.

Suggested artists’ photo/name links open their canonical artist profile; Bookmark remains a separate action.

Stored default/logo placeholders do not override real provider photos. Image requests have a separate best-effort rate-limit bucket (180/minute per IP, configurable with `RATE_LIMIT_ARTIST_IMAGE`) so collection browsing cannot consume the account API quota.

### Preview theme navigation

The concept preview keeps its own light-default theme preference on Vercel previews. Client navigation into or out of that route, including query-only transitions, must switch to the matching stored preference. Regular production pages always use the ordinary account/browser theme key.
