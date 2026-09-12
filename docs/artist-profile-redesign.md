# Artist profile redesign — issue #1230

Local implementation on `pete/1230-artist-page-redesign`; not released.
[Tracking issue](https://github.com/xdjs/MusicNerdWeb/issues/1230).

## Direction and meeting changes

The implementation uses Museum as its starting direction, with the existing pink,
neutral backgrounds, glass sections and platform icons. This is an implementation
choice based on the issue's leading candidate and positive banner feedback, not a
recorded A/B/C vote. All five reference images were downloaded and inspected from
[the design record](https://github.com/xdjs/MusicNerdWeb/tree/7b06d513f855435fb394fdda0c2484a8bf85e4b9/docs/rnd/design/2026-09-10-artist-page-redesign).

The [September 11 transcript](rnd/transcripts/2026-09-11-standup-ab5db51a596c.md)
supersedes the boards in these places:

- 13:25: combine Timeline into **Latest**, rather than having two sections.
- 17:21: keep artist search easy to reach. The existing navigation stays visible
  as the visitor scrolls; its search, account and add-artist flows are reused.
- 21:23–22:12: Pete owns the profile and Latest; Sweetman owns the read-only
  In Process integration (#1228). Upload/writeback is later work.
- 16:33: floating Ask was suggested. This implementation uses a bottom-right
  trigger and a sheet around the existing Q&A, suggestions and source chips.

## Visitor and editor behavior

An uploaded custom portrait leads the page with a stronger dark fade and the artist's
biography. Read more expands the full bio in place; Show less collapses it. Listen
opens a smoked-black glass picker with unboxed logos, compact rows and subtle
dividers. It includes only stored music destinations; In Process is excluded from
Listen and stays in Support. Read the story
is removed pending discussion Monday, September 14. Without a custom
portrait, the page retains a blurred thumbnail with a circular avatar. Photo
upload, claim states and edit mode remain available; the profile bookmark is removed.

Latest, Links and Lore navigation pills resolve to those sections. Latest reuses
Pete's earlier local read-only adapters for stored Instagram posts, interview
answers and bounded release catalogs. It has filters, horizontal scrolling,
keyboard gallery controls, image fallbacks and a detail dialog with original source
links. Release catalogs are read concurrently from known Deezer/Spotify artist IDs;
exact title/date/kind matches share one card with both service links. Approved source
pages with an exact release title can add Apple Music, Bandcamp, SoundCloud, YouTube
and supported saved-profile services. Release cards open the same compact glass service picker as Listen, with a small
cover and direct release links shown immediately. There is no dropdown or artist-profile
fallback in this picker. No guessed URLs, new scraping,
third-party resolver or database writes are involved. Expanded Latest details use a frosted charcoal glass surface with white text,
replacing the opaque blue-gray panel. In Process items remain Sweetman's adapter work, not a second section here.

Lore contains approved source cards and the generated inventory overview. The duplicate
About section is removed. The hero biography keeps its existing edit/regenerate/pin
controls, now in a frosted glass editor. One Save updates the public About and
archives the previous and edited versions in the existing transaction. The separate
Save to Lore button is removed; saved versions are accessible under Lore → Saved bios
in edit mode. These are version-history records, not new third-party research sources.
Pinned bios still require explicit unpinning. Unpin clears only the lock, retaining
the displayed text without refetching or regenerating it; Regenerate is a separate action. Pending sources stay gated to editors. Support the artist sits within Links and retains its separate grid and
submission controls. Links now appears above Lore. Editors drag the platform icons
(or use Space, arrow keys and Space to drop); there are no separate handles or
Save order buttons. Profile Done saves changed ordering before leaving edit mode.
A failure keeps edit mode and the draft available to retry. Saved ordering is public
and persisted in artists.link_order; new links append and removed links are ignored.
The route requires the approved claimant or a current admin and rechecks ownership
under the artist row lock. Saving one group preserves the other. The existing tour anchor IDs remain available, including the
fixed Ask trigger; the tour does not change that trigger to relative positioning.

## Summary generation and persistence

`generateLoreSummary` runs alongside document synthesis during the existing Lore
refresh. Only approved titles and media types are sent to Gemini, with instructions
to describe the collection in two or three short sentences. The UI never generates
on page reads. No sample board copy is stored. An empty source set, failed generation
or oversized response produces no overview.

`artist_docs.lore_summary` stores the text and a key for the approved source IDs,
titles and types. Persistence uses the existing claim-generation/job fence and
transaction. Public rendering compares the key to current approved sources, so a
removed, renamed, reclassified or newly approved source immediately hides a stale
summary until refresh. The About biography is not changed by summary refresh.
Existing documents gain an overview on their next successful Lore refresh; there
is no automatic backfill or regeneration of an existing biography.

## Migration and verification

Migration `0025_artist_lore_summary.sql` adds the nullable Lore summary.
`0026_artist_link_order.sql` adds nullable JSONB artists.link_order for profile ordering.
Both were applied only to Music Nerd Dev; the new column has mnweb SELECT/UPDATE
privileges and the existing artists RLS remains enabled. Both Drizzle snapshots and
journal entries belong in the same change. Type/nullability and existing mnweb
privileges were verified. The MCP session cannot SET ROLE mnweb,
and the local shell cannot resolve the dev database host, so an actual app-role
query remains unverified. No grants or policies were broadened.

Production has not been migrated. Apply these additive migrations through the normal
release process **before** deploying dependent code; do not replay historical migrations.

Follow-up npm run ci passed: TypeScript, lint, 197 suites / 2,348 tests passed /
6 skipped, coverage and production build with stub catalog credentials. This does not prove live providers, authentication, summary quality or
production database access. Browser verification at 390px and desktop remains required:
the user started the local server, but browser policy denied this session access to
localhost:3002. Exercise portrait/fallback, search, anchor jumps, source filters, Ask with citations, photo
upload, hero bio expand/edit/pin, service picker and saved link ordering on a running
dev/preview environment before release.

Local button review: Listen, Done, Add Link and bio Save use solid pink with black
labels/icons. Claim/Edit use neutral glass, active Latest filters use gray, and Ask
keeps a translucent pink glass finish with blur, an edge highlight and black text.
Rounded-lg corners, minimum 44px targets and focus states stay consistent. Scoped
CSS overrides legacy dark-mode rules that otherwise turn pink-button labels white.
This styling follow-up passed focused component tests, TypeScript and targeted lint;
live browser review remains blocked by the existing localhost permission denial.

The release/unpin follow-up passed full CI (197 suites, 2,348 tests, six skipped),
plus a subsequent server-section-to-dialog regression (nine focused dialog tests).
The later compact picker change passed those nine tests, TypeScript and targeted lint;
full CI above predates that UI-only follow-up.
Provider matching is covered with mocks; live cross-service availability and visual
review remain unverified in this session.

Ask uses the frosted charcoal glass treatment throughout the sheet, search input,
suggestion chips, answer panel, citations and song-link popovers. The sheet avoids
`bg-white` so the legacy dark-mode override cannot replace its surface with blue-gray.
A scoped placeholder override preserves subdued text. The pink glass trigger remains.
This follow-up passed 15 existing Ask tests, TypeScript, targeted lint (existing image
warning) and CSS compilation; live browser review remains unverified.

Add Link and Add Artist use compact charcoal glass forms with labeled full-width
inputs, subdued helper text and pink submit buttons. Add Link no longer displays
a large catalog image. Supported-link menus and the Add Artist duplicate-choice
state match the surface; the shared duplicate component keeps its default appearance
elsewhere. The account dropdown uses icons, Explore/Account grouping, 48px rows,
and a 288px mobile width capped to the viewport (256px desktop). Claim/admin and
wallet menu gates, contribution tracking, authentication and theme handlers are retained.
79 focused form/account tests, TypeScript, targeted lint (existing warnings) and CSS
compilation passed. Auth tests use mocks; live mobile layout/auth remain unverified.

Theme reload follow-up: a synchronous script in the document head restores the
saved `musicnerd-theme` class and native color scheme before paint. React starts
with matching server/client markup, then synchronizes to that preference without
applying the light default to the document. Storage failures fall back to the system
preference and do not break toggling. Login/logout still perform the existing full
reload. 29 focused theme/auth tests, TypeScript and targeted lint passed; tests
include hydration and pre-hydration initialization, but a real Chrome login/reload
visual check remains outstanding. HTTPS preview is now running on localhost:3000.

Ask interaction follow-up: the floating pink trigger now opens a non-modal glass
conversation panel anchored above it (390px maximum width, bounded to 65dvh/560px).
There is no dimming overlay or scroll lock. Two suggestions introduce the feature;
the composer stays at the bottom and answers scroll inside the panel. Question/answer
history and drafts survive minimizing, including responses that finish while hidden.
Escape restores trigger focus, while nested record menus handle their own Escape
first. Pointer opening does not summon the mobile keyboard; visual viewport changes
keep the composer above it. Keyboard opening focuses the input; reduced motion is
respected. Existing citation/provenance and record-link rendering is retained.
History is local to this artist-page visit; the existing API still answers each
submitted question independently, with no new persistence or server context changes.
20 focused Ask tests, TypeScript, targeted lint (existing image warning), and CSS
compilation passed. Actual browser animation/touch review remains outstanding.

Profile navigation follow-up: Pete selected option 1 after comparing three mockups.
Latest, Links and Lore share a full-width glass segmented control below the hero.
The translucent selection follows horizontal dragging and snaps to the nearest
section on release. Clicking a label navigates directly. Vertical swipes scroll
the page, cancelled drags do not navigate, and extra pointers are ignored.
The control uses real fragment links and aria-current, supports arrow/Home/End
keys, and removes movement for keyboard/reduced-motion navigation. Claim/Edit sit
beside Listen in the hero, using accessible icon controls on mobile. Existing
section offsets, claim permissions and profile save behavior are retained.
This is client-side navigation only: no API, persistence, jobs or service changes.
40 focused navigation/page/hero tests, TypeScript and targeted lint passed.
Browser access is unavailable in this session; visual/touch review remains pending
on the running HTTPS localhost:3000 preview.
