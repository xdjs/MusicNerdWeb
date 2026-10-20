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
the real Music Nerd glasses logo, and an eligible public bio excerpt. It never reads
sessions, private sources, interviews or raw research payloads. Bio eligibility
uses the same approved-claim/public-directory gate as page metadata. It resolves
only already-linked catalog identities; there is no name search or identity write.
Image eligibility is deliberately narrower than browser display: HTTPS Spotify and
Deezer image CDNs, this deployment's configured public profile-image storage path
for this artist, or checked-in artist images. No signed URLs, arbitrary hosts,
redirects, albums, social post thumbnails or private vault files. Unknown images,
failed downloads, unsupported formats and decode failures use the branded record
motif. A missing artist returns 404; database failure returns 503 without caching.

Images are fetched without credentials, bounded to five seconds and five MB, then
normalized to PNG. A one-hour public CDN cache bounds normal refresh latency after
an image/name/public-bio edit; no stale-while-revalidate. Provider caches can add their existing
latency. Social apps maintain independent caches: existing messages may retain an
older image until their service refetches. `v=1` versions this layout, not personal
data. Failed portraits still produce a usable named card and retry after cache expiry.

Names are normalized to NFC and checked against the actual glyph coverage of
Next's existing Noto Sans Latin font. Supported accents remain intact, including
Björk, Beyoncé and LATASHÁ. Names requiring unavailable glyphs (for example Dvořák,
Łona, Japanese, Cyrillic or emoji) use “Discover this artist” in the image; full names
remain in page metadata. This is a font-coverage boundary, not an ASCII restriction.
No additional font packages or runtime font parsing are introduced. A compact
coverage table is derived from the shipped font; a regression checks its exact
character map and file hash so a Next/font upgrade cannot silently invalidate it.
Offline regressions exercise the real renderer in a separate process, with all
fetch calls forbidden, rather than relying on the ImageResponse unit-test mock.
A render failure retries with the same neutral name and record motif.

Long names shrink and truncate with an ellipsis at 90 Unicode characters or the
layout line limit. Bio excerpts stop at a word boundary within 130 characters
(90 for long names), with a four-line visual limit. A true ellipsis denotes
truncation; short complete prose is unchanged. Full
names remain in page metadata. The design is theme-independent for predictable shares.
No database writes, paid model calls, jobs, migrations or new credentials.

## Verification

Check normal, absent/broken portrait, unknown artist, long name, and image security
boundaries. Inspect server-rendered OG/Twitter tags as a crawler, download the PNG,
verify dimensions, and view the proposal at 832 and 390 px in both themes. A browser
card simulation is not proof of native iMessage delivery; record that separately.

## October 20 revision — preserve supported accented names

The initial ASCII-only guard unnecessarily replaced names the existing font can
render. Pete requested the minimal correction before owner acceptance. The revision
keeps the same composition and font, normalizes decomposed accents, and uses actual
font coverage. Noto Sans full (569 KB) and Noto Sans JP (4.53 MB) were evaluated
locally but are not added: broader script support is outside this minimal correction.
The preview gallery demonstrates accented names alongside the remaining unsupported
Japanese example. Owner approval still applies to the proposal after re-verification.

## Owner-requested bio and brand revision (October 20)

Retain the portrait treatment. Replace the improvised brand heading with the exact
repository `public/music-nerd-shades.png` asset, on a pink field for contrast, plus
an understated domain label. The site uses a system sans stack (no bundled custom
font); image text uses the existing offline Noto sans renderer, without adding fonts.

Read only the same public bio selection as artist-page metadata: an approved claim
and real artist bio, otherwise the validated public directory About projection.
Never use unrestricted artist.bio, private Lore, interviews or research payloads.
No new writes or generation. Show a short contiguous excerpt of sanitized public
prose, with a true ellipsis only when it is shortened. Missing/ineligible bio or
unsupported excerpt glyphs omit the excerpt; the named card remains useful.
Bio lookup errors fail closed to a card without an excerpt and no-store. Normal
cards retain the one-hour cache; this also means previously public text may survive
revocation for up to that hour, and social platforms can retain their own copies.
The preview will include Pete Rango's real public profile and clearly labelled
fixture cases, including missing bio/image and accented names. Approval is pending.
