# User profile delivery contract

The regular `/profile` requires a real MusicNerd session. It renders the approved contribution-first design with account data, never preview fixtures. `/profile?preview=concept` is a separate development/Vercel-preview demonstration with in-memory edits.

## Data and behavior

- Identity comes from the session-owned user endpoint. Name edits reuse its validated PATCH. Photos use the private `user-profile-images` bucket, per-account paths and server-issued signed URLs.
- Impact reports accepted UGC and pending UGC under the existing moderation semantics; self-edits remain separately visible and never count as leaderboard credit. Recent rows and full history preserve canonical artist IDs and dates.
- Your artists lists distinct artists added by the user, with approved UGC by that user, or with recorded self-edits by that user. Pending/unapproved suggestions alone do not qualify. See [the contribution contract](contribution-artists.md).
- Your artists lately uses the same eligible artist query, with six-artist windows, two updates per artist after filtering, and explicit partial coverage. No scraping or new research is triggered by reading the profile.
- The collection has server-side search across all eligible artists and 24-artist pages. Artist names/photos open their canonical profiles. No save/remove action is required.
- Bookmarks are removed: the UI, the account bookmark API and, as of #1595 P5 (October 26, 2026), the `user_artist_bookmarks` table.
- Profile edits and errors retain their existing behavior. A collection/feed failure does not block identity or contribution history.

## API access — October 14, 2026

The signed-in profile header includes **API access**, a keyboard-accessible link to the
existing `/access` page. It uses the normal account profile, not the sample API-tab
prototype. The profile does not request or display a token. `/access` keeps its existing
Privy sign-in, temporary token, Copy and Refresh behavior. The signed-out profile still
asks the visitor to log in, and public artist profiles do not expose account credentials.

This is navigation only: no new token service, permissions, database writes, research jobs
or external service calls are introduced. Verify the profile entry and signed-out destination
on desktop and phone in both themes; do not include real tokens or account details in captures.

## Release verification

Verify anonymous rejection, account switching, qualifying additions/approved contributions/self-edits, repeated-artist deduplication, pending and bookmark-only exclusion, collection search/pagination, feed filter/fanout bounds, and empty/loading/error states. Check phone/desktop in both themes, profile editing and existing card/listening flows. This change requires no migration. Production release remains separately authorized.

## September 16 integration status

Migration `0028_famous_captain_britain.sql` was applied to the staging data environment before application delivery. Verified through its `mnweb` connection: RLS enabled, bookmark CRUD allowed, anonymous role denied, and self-edit reassignment restricted to `user_id` (content updates denied). The private photo bucket accepts WebP up to 2 MB. Migration-history reconciliation remains the separate #1148 work; this is not authorization for automatic migration replay.

Photo requests resolve the current database identity on every request and use a hashed Privy identity key where available, with the surviving account’s legacy path as an absent-object fallback. Profile query requests assert the expected account and validate response ownership. Self-edits and artist additions are recognized separately from approved contribution credit.

### Database connection budget

The shared Postgres.js app client uses at most three connections per process and closes idle sockets after 20 seconds; connection setup times out after 10 seconds. This limits the new profile’s concurrent summary/feed footprint after preview verification exposed staging session-pool exhaustion. It does not impose a project-wide limit or a query deadline. Existing deployments and development singletons keep their old pools until retired/restarted; do not terminate unrelated sessions. Transaction-pooler migration is a separate infrastructure decision. See [Postgres.js connection options](https://github.com/porsager/postgres#connection-details).

### Artist photos

Suggested and saved artist images load independently of account data. When no image is supplied, MusicNerdAPI's `/api/artist/[id]/image` resolves the artist's custom upload first, then the existing Deezer/Spotify image provider used by artist profiles. Successful redirects cache for one hour; missing/provider failures retain the tile's fallback and do not block profile loading. This public route returns only an existing public artist image, never account data, and does not generate or scrape content.

Artist photo/name links open their canonical artist profile.

Stored default/logo placeholders do not override real provider photos. Image requests go to MusicNerdAPI, so collection browsing does not count against the Web app's rate limit.

### Preview theme navigation

The concept preview keeps its own light-default theme preference on Vercel previews. Client navigation into or out of that route, including query-only transitions, must switch to the matching stored preference. Regular production pages always use the ordinary account/browser theme key.

### Profile edit failure boundary

When both fields change, upload and refresh the photo before committing the name. Upload failure leaves the name unchanged and the editor open for retry. A successfully uploaded photo updates the photo cache even if the subsequent name PATCH fails; the two endpoints are not an atomic transaction. A successful name PATCH refreshes the session.

If an upload succeeds but the subsequent photo read fails, discard the stale displayed photo, invalidate its query, and report that the photo saved while the name stayed unchanged. Retrying the same selected file retries the read rather than uploading again. Closing the editor leaves the normal photo-query retry available.
