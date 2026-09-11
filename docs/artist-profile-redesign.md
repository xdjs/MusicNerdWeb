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

An uploaded custom portrait leads the page, with the artist's real bio excerpt,
listening destination when available, and a link to About. Without a custom
portrait, the page retains a blurred thumbnail with a circular avatar. Photo
upload, claim states and edit mode remain available; the profile bookmark is removed.

Latest, Lore and Links navigation pills resolve to those sections. Latest reuses
Pete's earlier local read-only adapters for stored Instagram posts, interview
answers and bounded release catalogs. It has filters, horizontal scrolling,
keyboard gallery controls, image fallbacks and a detail dialog with original source
links. In Process items remain Sweetman's adapter work, not a second section here.

Lore contains approved source cards, the generated inventory overview and About.
About keeps its existing edit/regenerate/pin controls. Pending sources stay gated to
editors. Support the artist sits within Links and retains its separate grid and
submission controls. The existing tour anchor IDs remain available, including the
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

Migration `0025_artist_lore_summary.sql` adds one nullable JSONB column. Its Drizzle
snapshot and journal entry belong in the same change. It was applied to **Music Nerd
Dev** on September 11; JSONB type/nullability, existing RLS and mnweb column
SELECT/INSERT/UPDATE privileges were verified. The MCP session cannot SET ROLE mnweb,
and the local shell cannot resolve the dev database host, so an actual app-role
query remains unverified. No grants or policies were broadened.

Production has not been migrated. Apply this additive migration through the normal
release process **before** deploying dependent code; do not replay historical migrations.

TypeScript, lint, full Jest coverage and production build passed with stub catalog
credentials. This does not prove live providers, authentication, summary quality or
production database access. Browser verification at 390px and desktop remains required:
the current execution environment blocks local listening sockets (EPERM). Exercise
portrait/fallback, search, anchor jumps, source filters, Ask with citations, photo
upload and About edit/pin on a running dev/preview environment before release.
