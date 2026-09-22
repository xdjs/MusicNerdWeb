# Artist header

September 21, 2026 — issue #1307, local implementation; not released.

The current portrait header applies whenever the page has an artist photo, whether
from the existing music-platform lookup or an artist upload. Uploaded photos retain
precedence. Only an artist without either photo uses the centered placeholder header.
The fallback About block has automatic horizontal margins so both its text and
expansion control are centered within the header at desktop widths.

Confirmed cause: the page previously passed `hasPortrait` only for `customImage`,
while HeroSection switched that state on after a successful upload. This explains
why a provider photo used a different layout before uploading. The fallback About
had a max-width but no centering margins; this is not a Safari-specific rule.
The original Safari session and a paired after-upload screenshot remain unavailable.

The initial header-consistency fix changes rendering only. Provider selection, image upload, authorization,
storage and cache invalidation are unchanged. Photo-backed About text remains
left-aligned within the approved portrait layout; placeholder About is centered.

## Photo repositioning — September 21 follow-up

Pete approved the layout fix and requested vertical photo positioning. In edit mode,
Reposition photo opens direct drag controls. The photo also accepts up/down arrow
keys when focused; no visible slider or percentage is shown (Pete’s review feedback).
Save position persists framing; Cancel restores the previously saved position. The
same percentage is used on desktop/mobile, with a phone crop preview. Existing
photos remain top-aligned until positioned. Photos with no vertical crop cannot
move vertically at that viewport; use the phone preview to adjust its crop.

Store `{ imageUrl, y }` in `artists.header_image_position`, with y from 0 (top) to
100 (bottom). Apply the position only when its image URL matches the displayed
photo. Replacing a photo therefore starts at the top without modifying the original
image or accidentally applying an old crop to a new photo. Repositioning changes
neither storage objects nor biography, research, jobs, or external providers.

The authenticated PATCH endpoint uses the existing artist-edit permission check
(approved claimant or admin), validates the full payload, rechecks claim ownership under the existing artist row
lock, and updates only framing.
Migration 0029 must be applied and verified as mnweb before deploying this code;
staging migration verification is required for this PR. Production migration remains
a separate release prerequisite.
Local previews simulate persistence in this browser and are labeled accordingly.


Local verification for repositioning: route tests cover authentication, edit denial,
invalid input, persistence errors and missing artists. Component/page tests cover
Save/Cancel, retry and image-specific framing. Chromium and WebKit checks cover
832/390 widths, both themes, keyboard controls on the photo, mouse drag, reload and no overflow.
An additional Chromium touch-emulation check uses a tall fixture with vertical crop.
The migration was exercised in isolated PGlite with RLS: mnweb can save/read, and
anon/authenticated cannot write. This is not live Supabase permission verification;
the shared database migration and real signed-in save/reload remain release gates.
