# Artist Latest — first experiment

> **Unreleased local feature contract (`pete/artist-latest`).** The implementation, migration
> and test files described below are not included in this documentation release. Read
> [MEMORY.md](../MEMORY.md) for verification and release gates before using these commands.

## User outcome

On an artist profile, a visitor can see dated, image-led updates, filter by releases,
Instagram or "In their words", open a full card, and follow a real source link.
Cards form one horizontal gallery on mobile and desktop, with native touch/trackpad scrolling,
previous/next buttons and arrow-key navigation when the gallery is focused. All selected updates
are in the row; filters reset to the beginning. There is no grid or show-all expansion.

This is the artist-profile experiment agreed in [decisions](rnd/decisions.md), not a global
homepage feed. It adds no migration, new credentials or publication action.

## Reference and visual choices

Inspected [MNTv at 446245b](https://github.com/xdjs/MNTv/tree/446245bfc12fab4f3e0eedc67365999e7caa5f1e):
`NuggetCard.tsx`, `companion/CompanionNuggetCard.tsx`, and `useAINuggets.ts`.
Borrowed image-led rounded tiles, translucent category badges, pink accents, brief text and
expanded source-backed detail. Existing Radix Dialog supplies the popup behavior.

MNTv prefers a contextual image, then artist portrait/track art according to topic.
This experiment reuses our stored Instagram image fields and real catalog covers; it does not
copy MNTv's image-research services or generate images. Release artwork is contained rather than
cropped/overlaid, with provider attribution and an outbound listening link.

### Image sourcing audit

The current MNTv `supabase/functions/generate-nuggets/index.ts` obtains images from Exa research
results (`image` / `extras.imageLinks`), filters for the artist, and on its multimodal path lets
Gemini select among downloaded candidates. It avoids duplicate image URLs within a batch,
uses Wikipedia/Commons for contextual fallbacks, and the client finally falls back to Spotify
artist/track artwork. That Exa search explicitly excludes Instagram and Facebook. The old
standalone `nugget-image` function is marked deprecated; it isn't the current path to copy.

MusicNerdWeb's existing `socialIngest.ts` already retains Apify's post-image URLs in `raw`, but
does not download/store those images. On 2026-09-06, all nine sampled own posts had `displayUrl`;
one also had carousel images. The three sampled signed URLs carried expiry values corresponding
to August 23, consistent with the browser failures. Missing extraction isn't the primary gap:
durable media is. [Apify's output](https://apify.com/apify/instagram-scraper) includes image URLs,
carousel children and video media; those URLs alone aren't durable assets.

Recommended next scope, **not implemented**: retain an authorized thumbnail during the existing
ingest job (post image, carousel cover or Reel thumbnail), with original-post attribution and
removal handling. Refresh a bounded set of old posts for the preview. Use matching release art
or artist-approved press images when relevant, and a text/quote card when no appropriate image
exists rather than repeating the logo or presenting an unrelated photo as the post's image.
No new scraper, paid run, image upload or storage-policy change has been made for this audit.

## Data path and boundaries

`artist/[id]/page.tsx` → Suspense `LatestSection` → `getArtistLatest` →
independent social/interview/catalog reads → normalized view data → interactive `LatestCards`.

| Card | Data and time | Image and link |
| --- | --- | --- |
| Instagram | Up to nine stored own posts, newest `posted_at` first | Stored display/thumbnail image; original validated Instagram post/Reel URL |
| Interview | Up to six nonempty answers, excluding `source=offered`; `created_at` is answer/upsert time | Related stored post image when in the selected set; existing question-key source resolver; no invented link |
| Release | Up to three already-released items from a bounded catalog, known Deezer ID first and Spotify fallback | Provider cover art and validated album URL; no name-based artist matching |

The release adapter reads at most 50 catalog entries per provider, caches the catalog for an
hour, and bounds each provider attempt to five seconds. The preview sorts that bounded response;
it does **not** promise a complete discography or the newest item beyond those 50 entries.
Provider year/month date precision is retained; uncertain current-period releases are omitted.

Social/interview reads use the existing Drizzle client and `mnweb` role. Only projected image
fields, selected text and source URLs reach the client, never the complete scraped payload.
Partial source failures preserve the other cards and show a notice. An unavailable feed is
distinguished from a genuinely empty one.

**No new backend mutation or worker.** Existing ingest/research jobs populate the social tables;
visiting Latest does not scrape Instagram, enqueue a job, generate an answer or change interview
`sitting`/`offered_at`. Instagram freshness depends on those existing ingestion jobs, not on
an automatic refresh introduced by this feature.

## Known limits and next decisions

- Instagram image URLs in existing data can expire. The dev sample failed to load contextual
  images and used the artist fallback; real release artwork did load. Candidates fall back to
  artist image, then the local placeholder. Reliable historical post images require a scoped
  ingestion-time storage/refresh design and a decision about retaining third-party media.
- This section does not refresh Instagram data or implement notification subscriptions.
- The initial audit found browser-only bookmarks. Pete clarified that they must sync by account;
  that implementation and its separate migration are documented in [account-bookmarks.md](account-bookmarks.md).
- These are preview limits, not reasons to silently add new storage, migrations or services.

## Verification

Focused Jest tests cover real artist-page wiring, combined query mapping, raw-data exclusion,
ordering, source validation, provider fallback, empty/partial failures, filtering, dialog
content and image fallbacks. Existing regression suites remain intact.

Read-only browser check against an artist with existing dev activity:

```bash
npx playwright install chromium
LATEST_ARTIST_ID=<existing-artist-uuid> \
E2E_BASE_URL=https://localhost:3002 \
npx playwright test e2e/artist-latest.spec.ts --workers=1
```

Without `LATEST_ARTIST_ID` this live-data test is explicitly skipped. It exercises only the
categories present in the chosen data; select an artist with all three to cover the full flow.
It checks loaded images (which may be fallbacks), source links, popup close, mobile overflow,
single-row desktop layout, arrow/button/trackpad scrolling and filter reset, and writes ignored
screenshots under `test-results/`.

2026-09-06: the dev run exercised all three categories, a real Deezer catalog, stored Instagram
posts and an existing interview answer, on desktop and mobile. The app used the dev database.
No claim, answer, ingest or migration action was triggered by this test.
The existing development session fallback was active, so this is **not** proof of real Privy
login or production anonymous access. Spotify failures/fallbacks are unit-tested, not live-verified.

Full-suite/build results and remaining release status belong in `MEMORY.md`.
