# User profile redesign (#1274)

> September 22, 2026 — #1325 supersedes the bookmark-based UI described below.
> Pete reconfirmed the September 21 decision with Carl: remove bookmarks for now
> and derive both artist sections from additions/approved contributions/self-edits.
> See [#1325](https://github.com/xdjs/MusicNerdWeb/issues/1325). Stored bookmark data
> is preserved; the following is historical design/persistence context.


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

## Interactive concept preview

Development-only route: `/profile?preview=concept` (local server port 3017). Both page and client wrapper gate this route on development mode. Real browser bookmarks are combined with 18 labeled fictional artists and 24 fictional contributions. Name/photo edits in this concept stay in memory; the regular profile retains its separate account-backed photo implementation.

The compact collection is a horizontal strip of all bookmarks. Search collection and View all open the same searchable, vertically scrolling collection sheet. Account details remain beneath the name; no personal bio. The menu trigger changes to a close icon and highlighted state while open.

Your artists lately is one mixed horizontal gallery using the actual artist-profile LatestCards and shared detail/listening dialogs. The preview sorts newest first, caps each artist at two updates and the gallery at 12, and labels the artist on each card. Source filters include In-Process. The real Pete Rango mix fixture includes verified Deezer album 970786431, Spotify and Apple Music destinations; fictional releases have no invented listening links. Other artist updates remain simulations, not a live aggregation service.

Neutral light/dark backgrounds replace the rejected full-page pink gradient. Pink accents, translucent gallery surfaces and theme-aware glass navigation are scoped to the concept. The contribution invitation offers separate Share a link and Add an artist actions. Contribution summary links filter the simulated history.

Validation: TypeScript passed; LatestCards and UserEntriesTable tests passed (14 tests). Mobile browser verified horizontal gallery scroll, no document overflow, and the real release picker’s three destinations. Nothing from this profile design has been pushed to staging.

## Team design preview — September 15

Pete approved publishing a Vercel preview for team feedback, not a staging or main release. On Vercel preview deployments only, `/profile?preview=concept` renders an unauthenticated sample account with an example.com email and fixed demonstration artists. The sample user does not authenticate anyone or grant API access. Local development continues to use the signed-in user's bookmarks. Production does not expose this concept route. Artist links are omitted for fixtures without verified environment-specific IDs; the real release's public listening links work. Edits remain in memory. Navigation outside the concept uses ordinary application authentication.

## September 16 — contribution-first local iteration

Team feedback prioritizes recognition of effort above artist browsing. The local concept now leads with compact identity (account details retained), Your impact with approved contribution count, secondary pending count, and three recent contributions. View all contributions opens searchable/filterable history in a dialog; status totals open it with the corresponding filter. Saved artists and Latest remain below. Counts and recent entries remain clearly labeled sample activity. No invented points or new credit rules. This iteration is local-only pending Pete's review; the September 15 Vercel preview remains unchanged.

## Preview catalog — September 16 (local, not yet redeployed)

Keep these query parameters when sharing the next approved Vercel deployment. The public showcase now forwards the same state/collection parameters; this code is local until redeployed. The September 15 hosted preview is stale relative to these iterations.

| Scenario | Local review link | What it demonstrates |
| --- | --- | --- |
| Returning contributor, populated bookmarks | http://localhost:3017/profile?preview=concept | Impact, recent contributions, contribution invitation, collection and sample Latest |
| First contribution, populated bookmarks | http://localhost:3017/profile?preview=concept&state=new | One invitation with Add an artist / Update an artist; no duplicate contribution CTA |
| Brand-new user, no bookmarks or contributions | http://localhost:3017/profile?preview=concept&state=new&collection=empty | Collection invitation; centered live artist search with direct Bookmark actions |
| Returning contributor, no bookmarks | http://localhost:3017/profile?preview=concept&collection=empty | Collection falls back to artists from approved sample contributions, explicitly labeled |
| Profile loading | http://localhost:3017/profile?preview=loading | 64px shared artist-build logo/halo, no visible text (development only) |
| Actual artist-generation reference | http://localhost:3017/profile?preview=artist-build | Existing BuildStatus with static progress fixture (development only) |

### Collection fallback decision

Pete requested artists the user has added or updated as the fallback when there are no bookmarks. Bookmark collection takes precedence; contributing does not silently create bookmarks. This concept derives a deduplicated fallback from approved sample contribution rows, using real artist metadata where available and labeled fictional fixtures otherwise. Real added/updated artist queries remain implementation work, not proven persistence. Once the first bookmark is selected, the collection shows explicit bookmarks instead of the fallback.

Find artists opens a themed, centered live search with artist photos and in-place Bookmark buttons. Only artists already in MusicNerd are offered; it does not create artists as a search side effect. Preview bookmarks, name and photo edits live in memory and reset on reload. Real browser bookmarks and account records are untouched. The empty-collection variants suppress unrelated fictional Latest updates.

### Sharing checklist for the end of iteration

- Publish only after Pete approves the iteration; record the actual deployment URL and commit here.
- Share the first four scenario links using that deployment's host; test them signed out and in both themes.
- Keep sample counts/activities labeled and verify no personal account data is exposed.
- Recheck mobile widths, search → bookmark → visible collection, edit dialog, both contribution entry actions, collection/history dialogs, and Latest expansion.
- Loading and artist-build reference URLs remain local-only unless explicitly enabled for public preview later.

### September 16 — contributed artists become suggestions

The automatic fallback and repeated “You contributed” labels are superseded in the current iteration. Contributions do not establish a bookmark relationship. In the returning-contributor/no-bookmarks scenario, Your artists starts empty; a compact “Start with artists you’ve helped” list offers up to three deduplicated sample suggestions with explicit Bookmark actions. Selecting one adds it to the collection and removes it from suggestions; remaining suggestions stay available. This is still in-memory preview behavior. The same catalog URL (`collection=empty`) now shows this iteration.

### September 16 — real-account integration

Pete approved making the contribution-first design the regular signed-in `/profile`, with advisor review, then delivering it to staging. `LiveUserProfile` supplies account-owned contributions, persistent photos and bookmarks to the shared presentation; demonstration routes remain separate and retain the state variants above. See [the live contract](../../../user-profile.md) for data semantics and release checks. No automatic bookmarks are created from contributions: people explicitly save suggested artists.
