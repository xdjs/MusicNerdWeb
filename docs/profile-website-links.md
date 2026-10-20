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
