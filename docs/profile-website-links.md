# Profile website destinations — #1583

Approved main website sources belong in Links alongside the other destination icons.
Supporting pages belong in Lore, even when their source type records artist-owned Website.
Pete confirmed this distinction on 2026-10-20 after reviewing the first phone preview.
The saved walkthrough exposes `https://theelliscourt.com/` and its
`/whats-the-ellis-court-2/` biography: one globe in Links, biography in Lore.

A shared read-time rule uses the complete approved website inventory: a query/fragment-free
URL is the main destination for other pages beneath its exact origin and path-segment
boundary. Thus `/artists/alice/` can be a hosted homepage and `/artists/alice/about`
a supporting page, without matching `/artists/alice-two/`. Equivalent URLs remain eligible
for canonical deduplication. Pending/rejected roots never affect approved placement.
Resolve placement before hidden-link filtering so hiding a homepage cannot promote its
biography. Known platform/Support/release rules take precedence. Public unclaimed profiles
continue hiding Lore, including supporting website pages; the editor retains source evidence.

Do not guess a standalone path's purpose from words such as `about`: it may be a hosted
artist homepage. Without an approved ancestor, ambiguous standalone/sibling pages retain
existing destination behavior and require source review. No redirects, www aliases, or
scheme equivalence are guessed.

Ingestion audit: `applyProfileLinkDecisions` uses artist-title ownership to set `website`;
`insertVaultSource` persists it, and API-owned research can also supply it. Ownership is
not homepage semantics. Those shared writers and #1424 research are unchanged. The shared
read-time role applies equally to existing and newly ingested website records, independent
of arrival order once the main site is approved. No stored URL/type/provenance is changed,
and no migration or production correction is required for the recorded pair. Raw-type
consumers outside profile rendering (e.g. research outcome evaluation and private link-review
history) still see the original ownership classification; they are not public placement proof.
Substack remains Article/Lore; provider identity work remains outside this change.

Website presentation compares canonical URL serialization (host casing, default ports,
and root slash) against both direct and source-backed destinations.
Keep path case, non-root trailing slashes, scheme, www host, query parameters and fragments:
those can identify different destinations without redirect evidence. Keep original hrefs
and source identities; do not rewrite records, approvals, provenance or removal history.

Website sources use the existing icon grid. As before, website review/removal stays
in Lore; the grid does not introduce a Remove action that could leave an equivalent
source visible after removing only one row. Platform source removal is unchanged. Pending,
rejected and blocked records remain hidden. This changes presentation only; database,
research jobs, providers and mutation authorization are unchanged.

Before a PR is ready, verify the exact commit preview at 832px and 390×844 (2×,
touch), light/dark, public/edit views. Capture Links, Support and Lore, usable website
icon, duplicate variants, distinct URLs and negative/private cases. Record the exact preview SHA and screenshots with the PR. Pete is the requested reviewer; an acceptance owner still needs
confirmation separately from issue assignment.

The non-production `/dev/website-links-preview` route compares illustrative before
pills with the actual fixed grid using local fixtures. It is disabled on production,
uses no artist query, and provides no mutation controls in the fixture. The app shell
still mounts auth/navigation; review logged out and avoid global add/login actions. It reproduces the recorded root/deep-page pair, plus a separate synthetic equivalent
homepage variant. Integration tests cover Links, Support, public Lore and preservation of source identities. The fixture uses the real Lore renderer, not a
static substitute. It does not rewrite persisted source classifications. Later authorization on
2026-10-20 permits a feature-branch preview before any main merge.

### Thumbnail metadata (2026-10-20)

Onboarding now preserves the `imageUrl` already returned by `fetchLinkPreview`
as the source's `ogImage`, just as manual Lore additions do. No extra fetch,
permission change, ownership decision or background job is introduced. Valid
HTTPS OG metadata remains subject to the existing preview parser; absent metadata
stays null. Supporting website pages use the same Lore image renderer as other
sources, falling back to the site favicon and gradient when images are missing or
fail to load.

On 2026-10-21, Pete identified that the earlier fixture used his logo on The Ellis Court biography. That explicit assignment was misleading, not an account-avatar fallback or a saved source update. A temporary neutral TEST IMAGE replaced it; that demonstration is now superseded by the captured real page image described below. Never use unrelated artist branding.

The preview also includes missing-image
metadata, and an intentionally broken local image URL. These fixtures verify
rendering, not a live artist metadata extraction. MusicNerdAPI PR #69 adds image preservation to the API extraction job and is required for the paired preview. Existing text-bearing rows without images are not backfilled by this change and require a separate reviewed correction.

Lore also checks already-completed failed images when attaching the image node,
so failures before hydration reveal the fallback. Image nodes are keyed by URL
so replacing a failed thumbnail retries the new URL.

### Suggested-link review consistency

The private suggestion list and decision endpoint read the same artist's complete
approved website inventory after acquiring the existing ownership/review lock.
Supporting pages are excluded from Suggested links and reviewed through Lore;
`Add to Links` remains reserved for artist destinations. Stale link actions for a
page that now belongs in Lore are rejected with `Review it in Lore` before any
status, activity or extraction-job write. Homepage anchors are independent of
suggestion pagination and visibility; pending, podcast and other-artist records
cannot anchor this classification. URLs, source attribution and moderation are
unchanged.

### Local extraction demonstration (2026-10-21)

The review page's biography card uses the actual HTTPS `og:image` returned by MusicNerdAPI's guarded reader for the linked Ellis Court biography on 2026-10-21, recorded in `ellisCourtPreview.json`. It loads that remote source image through the normal Lore renderer. This is a captured extraction result, not a live scrape on each render and not a saved staging artist source. API extraction remains in MusicNerdAPI. The page explicitly separates this demonstration from the still-pending authenticated saved-ingestion test. Missing and broken image fixtures remain separately labeled. No unrelated test artwork or account logo is used for the biography.

### Temporary preview-only thumbnail integration experiment (2026-10-21)

Local experiment only; remove this experiment and its configuration before merge.
`MN_THUMBNAIL_TEST_SCOPE` is a server-only JSON object with one `artistId`, exact
canonical `url`, and numeric `expiresAt` (milliseconds). It activates only on
Vercel Preview for `codex/1583-suggestion-routing`, with at most 24 hours remaining.
For that one source, owner submission retains normal authorization, image metadata,
transactional insertion and `source_extract` scheduling, but does not enqueue the
paid AI Lore rewrite. The response explicitly reports the skipped rewrite. Removal
of that exact source also skips rewrite, including after expiry. Other source URLs,
artists, branches and production retain their normal behavior. Keep the same preview
and scope configuration until test cleanup is verified; do not use bulk removal.

This does not cancel or suppress existing jobs. Before activation, verify that no
existing Lore job can consume the temporary source or be advanced by the test UI.
Do not call the general research advance endpoint, which may execute unrelated paid
jobs. Source extraction alone has no model call. Deployed extraction requires an
independently verified safe worker route. This experiment is not a dollar cap and
must not be represented as AI-rewrite or non-admin authorization coverage.
# Temporary preview queue inspection

The guarded `/dev/thumbnail-test-status` view uses the configured test artist, the existing server-session edit authorization, and the existing Privy-authenticated API read client. Active preview scope and edit authorization are rechecked before every page read. It paginates the research-status endpoint and displays only extraction-job IDs, status and progress. Failures or incomplete pagination are never an empty queue. It has no mutation or worker controls. Remove this diagnostic with the temporary test suppression before merge.
