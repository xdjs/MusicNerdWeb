# User profile redesign (#1274)

September 15: Pete prioritized a shippable visual redesign using existing capabilities. Local approval first, then staging review and main release. Spotify integration follows in a separate preview branch after this design ships; no connection buttons or TV launch in this pass.

The owner profile leads with identity and a visual saved-artist collection. A contribution invitation opens the existing Add Artist dialog; counts, recent edits and the existing filterable contribution history remain visible. Username editing and bookmark removal/reordering retain their current persistence. Bookmarks still live in browser storage; no cross-device claim or migration.

The compact leaderboard Dashboard remains separate. No auth, database, research, provider or scoring change. Profile collection cards use grid-aware sorting and accessible edit/remove labels. Empty collections offer artist search; username editing has a labeled field and cancel restores the saved value. Homepage pink is #ff75d8 with black text on pink surfaces in both themes.

Validation: focused Dashboard/ClientWrapper tests cover existing-bookmark destinations, edit controls, username cancel and the Add Artist entry point with controlled dependencies. Local uses the previously configured Dev environment and its development auth fallback; this is not evidence of real Privy login. Live submissions and username mutations are not needed for a visual review. Full CI and browser checks are recorded when completed.


Local verification: 36 tests across DashboardDesign, ClientWrapper and ArtistPage pass; TypeScript and lint pass (existing warnings). Browser checked at 390 and 832 widths in light/dark, plus the normal desktop viewport. Confirmed existing Add Artist dialog opens without submitting, username editor opens/cancels, artist bookmark persists into the profile collection, and collection editing exposes labeled reorder/remove controls. Restored the existing BookmarkButton on authenticated artist pages because it was no longer mounted. No server-side bookmark mutation or new persistence was introduced.

Not yet run: full pre-PR CI/build for this branch, hosted exact-commit preview, actual Privy sign-in and live username/contribution submissions. Local preview: http://localhost:3017/profile . First design pass awaits Pete's review; nothing pushed.

## Second design pass — September 15

Pete requested the MusicNerd logo loading state, a redesigned history, useful information from bookmarked artists and account-backed profile photos. Profile loading now uses the site logo inline; Dashboard's artificial 500 ms delay was removed. Contribution history is a responsive activity list with labeled search/platform/status/order controls, explicit loading/error/empty states and ten-row pagination. It uses the existing `all=true` own-history API so filtering covers all entries rather than losing pages through competing requests.

Bookmarked cards read a bounded batch of six existing artist biographies (the same real-bio guard as artist pages) and link directly to Latest and Links. This does not generate new research or fetch streaming catalogs. Missing summaries retain useful navigation.

### Profile photos and release setup

Photos use a **private** Supabase Storage bucket `user-profile-images`, keyed by the verified Web account ID: `<user-id>/avatar.webp`. No new database column or migration is needed. Only the server calls storage; browser uploads go through an authenticated same-origin route. Client-provided user IDs are ignored. Accept JPG/PNG/WebP up to 2 MB; Sharp validates/decodes with a pixel cap, normalizes orientation, strips metadata, crops/resizes to 512 square and encodes WebP. Reads issue one-hour signed URLs with private/no-store API responses; overwrites use cacheControl 0 and a fresh URL cache parameter.

Before deployment, provision the private bucket in the target environment with 2 MB maximum object size and only image/webp uploads. Do not add direct client read/write policies. The configured Dev bucket was created and read back as private; a temporary WebP round-trip matched bytes, public URL access failed, and the test object was removed. Production storage was not changed. Profile photo ownership is distinct from artist photos; broader cross-app/legacy-account migration remains outside this pass.

Tests cover unauthenticated reads/writes, cross-origin rejection, malformed image rejection, server-derived ownership, image normalization and signed reads. UI coverage verifies upload then remount reloads the stored account photo. Real two-device Privy login has not been exercised; the local preview uses existing development authentication. No personal photo was uploaded by the agent.

Second-pass validation: full Jest coverage run passed (217 suites, 2,487 tests; six existing skips), TypeScript passed, lint passed with existing warnings. Local browser confirmed new photo control, Pete Rango bio excerpt, restored history after search, and mobile rows/filters without page overflow. Production build and hosted preview remain pre-PR/release checks.

## Creative review — September 15

Pete requested “Know something we don’t?”; the contribution headline is updated locally.

Review recommendations, not additional approved implementation:
- Make the header about the person: chosen display name and photo, one Edit profile entry, secondary account details. Avoid using the bookmarked artist's name as the user's identity without their choice.
- Make artist-specific contribution opportunities visible. Existing artists need link contributions as much as the directory needs new artists; the current CTA only covers adding an artist.
- Reduce the pink invitation's visual dominance and tighten the tall gap before recent contributions; let artist imagery lead.
- Give the collection an explicit add/search affordance even when populated. Explain browser-local persistence honestly; account-synced photos alongside local-only bookmarks remain a meaningful continuity gap.
- Prefer fresh, dated artist updates over repeated bio excerpts in a future return-visit feature, using actual available content with no fabricated activity or research-on-read.
- Use plain-language contribution labels and elevate pending/review outcomes. Keep full history below; avoid adding badges/counters without a useful action.

Recommended next visual pass: personal header and unified editing, contextual contribution entry, tighter layout. New data persistence and fresh-activity aggregation need separately scoped implementation; Spotify/TV remain deferred.
