# Artist composite link previews — proposal (#1579)

October 20, 2026: Pete authorized an isolated implementation and phone preview. This
is a design proposal awaiting owner acceptance, not approved artwork or a release.
The Gemini reference was read in Chrome: its useful design input is a server-rendered
image exposed through Open Graph. Its claims about Google's internals are unverified.

## Contract

Artist URLs advertise a 1200 × 630 PNG at `/artist/{id}/share-image?v=1` in Open
Graph and Twitter metadata. Preview metadata points at its own Vercel deployment;
canonical artist URLs remain on musicnerd.net. Homepage artwork remains unchanged.

The card combines the public artist name, the existing profile portrait selection,
Music Nerd branding, and a fixed discovery line. It never reads sessions, private
sources, interviews, claim status, research payloads or biographies. It resolves
only already-linked catalog identities; there is no name search or identity write.
Image eligibility is deliberately narrower than browser display: HTTPS Spotify and
Deezer image CDNs, this deployment's configured public profile-image storage path
for this artist, or checked-in artist images. No signed URLs, arbitrary hosts,
redirects, albums, social post thumbnails or private vault files. Unknown images,
failed downloads, unsupported formats and decode failures use the branded record
motif. A missing artist returns 404; database failure returns 503 without caching.

Images are fetched without credentials, bounded to five seconds and five MB, then
normalized to PNG. A one-hour public CDN cache bounds normal refresh latency after
an image/name edit; no stale-while-revalidate. Provider caches can add their existing
latency. Social apps maintain independent caches: existing messages may retain an
older image until their service refetches. `v=1` versions this layout, not personal
data. Failed portraits still produce a usable named card and retry after cache expiry.

Names outside the bundled ASCII glyph set use “Discover this artist” in the image;
the full name remains in page metadata. This conservative proposal avoids implicit
third-party font/emoji fetches and needs owner review for international artists.
A render failure retries with the same neutral name and record motif.

Long names shrink and truncate with an ellipsis at 90 Unicode characters. Full
names remain in page metadata. The design is theme-independent for predictable shares.
No database writes, paid model calls, jobs, migrations or new credentials.

## Verification

Check normal, absent/broken portrait, unknown artist, long name, and image security
boundaries. Inspect server-rendered OG/Twitter tags as a crawler, download the PNG,
verify dimensions, and view the proposal at 832 and 390 px in both themes. A browser
card simulation is not proof of native iMessage delivery; record that separately.
