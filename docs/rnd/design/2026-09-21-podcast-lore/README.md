# One podcast appearance, multiple listening destinations

Issue #1304 — Pete approved this presentation September 21, 2026. The original
local prototype provided the visual reference; this branch implements ingestion,
storage and public grouping. It is not yet merged or deployed.

## Verified example

The [Apple Podcasts listing](https://podcasts.apple.com/us/podcast/building-the-sound-of-rein-with-jordan-rein/id1877956390?i=1000780276007)
and [iHeart listing](https://www.iheart.com/podcast/269-the-hook-with-johni-jess-323320053/episode/building-the-sound-of-rein-with-340460192/)
share the episode title, show and August 6, 2026 date. More decisively, both expose
the same Buzzsprout media resource: show `2596593`, episode `19605095`. iHeart adds
`?source=iheart`. Apple additionally exposes GUID `Buzzsprout-19605095`, feed
`https://rss.buzzsprout.com/2596593.rss` and duration 5,231 seconds. The compact
[metadata fixture](jordan-episode.fixture.json) preserves these observations.
Raw provider HTML remains outside the repository.

## Presentation proposal

One Lore card uses episode artwork, a Podcast badge, show name, episode title and
separate Apple Podcasts / iHeart links. Neither service is silently chosen for the
listener; the card itself is not a competing third link. Links open in a new tab.
Single sources retain their existing presentation. Counts represent visible stories,
not the number of listening destinations. This concerns Lore, not Latest.

## Implementation contract (September 26)

- Preserve each original source row, URL, provenance and approval/rejection state.
  The public view groups approved rows only; the existing editor continues to show
  each source independently. Rejecting one destination removes only that destination.
- `fetchPageContent` inspects fetched Apple Podcasts/iHeart episode HTML during
  ingestion. It stores a `buzzsprout:<show-id>:<episode-id>` key only when the
  page exposes exactly one distinct Buzzsprout recording. Apple must also expose
  the matching feed and episode GUID. Ambiguous pages stay separate. The same
  fetch records show and episode display titles when present.
  This first implementation supports the verified Buzzsprout pair; other hosts
  remain separate until an equally reliable identity extractor exists. The
  artist-page read path never fetches provider pages.
- Migration `0030_podcast_episode_identity.sql` adds nullable identity and title
  columns. Apply it to staging before preview verification and to production
  before deploying dependent code. App role `mnweb` retains its existing table
  grants and RLS policies; verify access as that role during migration review.
- Existing rows need a separate authorized enrichment pass after migration:
  `npx tsx scripts/backfill-podcast-episode-identity.ts <artist-uuid>` previews
  candidates, then `--write` persists metadata. Use the artist ID for the
  **target database**, since staging and production IDs differ. This never
  changes a source's URL, status, provenance or approval decision.
- URL handling must be provider-specific: Apple's `i` query parameter identifies the
  episode and must survive normalization. Do not generically strip query strings
  from media links or assume an arbitrary similar path identifies the same recording.
- Compute public groups deterministically from stored identity each render, so a
  rediscovery of an already-identified episode doesn't add a duplicate visible card.
  A rerun without reliable identity remains separate until verified enrichment.
- Test distinct episodes on one show, near-identical titles, uncertain/missing metadata,
  locale/tracking variants, separate artists, mixed approval states and reruns.

The read path is VaultSection → PressAndFeatures. `groupPodcastSources` projects
approved source rows into cards from persisted identity. Ingestion also covers
manual add and both onboarding enrichment paths; the editor continues to receive
the original rows. The branch has not changed any live database or source state.

## Local review

`http://localhost:3005/dev/podcast-lore-preview` has a Current / Grouped toggle and
a theme toggle. Current renders the real PressAndFeatures component with the two
fixture URLs. Grouped is a visual prototype using their verified shared identity;
it does not run automatic matching. Dev route and cached artwork are local-only.

Verified locally September 21: TypeScript passed. Chromium and WebKit at 390/832 px,
light/dark: grouped state one card/two episode links, current state two real source
cards, toggle works, no document/card overflow, no page errors. Apple's episode
query parameter is retained. Screenshots and local preview backups live in the
root checkout's ignored September 21 handoff. This is fixture UI verification,
not ingestion, persistence or authenticated end-to-end verification.
