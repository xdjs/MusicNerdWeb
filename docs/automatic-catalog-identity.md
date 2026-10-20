# Automatic catalog identity

The legacy Web “Search web for sources” action still adopts discovered profile links.
For Spotify and Deezer only, every adoption now requires an exact, uncontested
Wikidata pair with the artist's existing opposite-provider ID. Names, relevance
judgments and guessed profile URLs alone do not establish this relationship.
Missing, ambiguous, malformed or unavailable evidence leaves the candidate unconnected;
ordinary source collection and other platforms continue. An existing different
catalog ID is preserved. This trades automatic coverage for identity safety.

The shared writer rechecks both observed catalog slots atomically while retaining
its ownership, identity locks and direct/mapping collision guards. Stale evidence
cannot replace a later edit. Explicit authenticated confirmation keeps its existing
path and does not require Wikidata, but still has ownership and collision checks.
No additional Spotify/Deezer requests or new jobs are added; the additional public Wikidata request
has a four-second timeout. No schema migration or existing-record correction occurs.

This is the Web companion to MusicNerdAPI#62 for MusicNerdWeb#1580. API automatic
onboarding and research have the corresponding guards; its dedicated Spotify
recording matcher remains separate. Existing wrong anchors, saved IDs and cached
releases need separate evidence and correction authorization. The Rnd1 catalog
reconstruction demonstrates wrong releases from a wrong saved Deezer ID, not the
unknown historical attachment path. Alias tests use synthetic data; empirical
alias coverage is deferred per Pete's prevention-first priority.

Acceptance requires caller regressions, real local SQL stale/ownership/collision
checks and exact-commit CI. Authenticated preview mutation is not authorized against
the shared staging database. Owner flow review remains pending, including 390×844
phone at 2×/touch and 832px desktop in both themes; no phone preview is claimed.

## Prevention matrix

| Boundary | Prevention / remaining limit |
| --- | --- |
| Web source-search button → `dashboardActions.searchWebForSources` → `searchAndPopulateVault` | This patch: all five adoption paths use the DSP guard; rejected candidates do not update in-memory handles/provisional state. Ordinary interview sources still save. No API hop or routing flag on this path. |
| API generic onboarding discovery | API#62: both DSPs require reciprocal evidence and atomic stale checks. |
| API research adoption | API#62: same DSP gate at the shared vault writer. |
| Dedicated API Spotify recording matcher | Existing separate recording evidence, tie/eligibility and locked collision checks; unchanged. Opt-in PostgreSQL acceptance still outstanding. |
| Explicit Web/API owner confirmation | Retains authenticated ownership and direct/mapping collision checks; intentionally does not require automatic corroboration. Human confirmation can still be mistaken. |
| Web MCP, directory creation and approved UGC | Existing explicit-input/approval boundaries, unchanged. This patch does not certify semantic correctness of submitted IDs. |
| Legacy Web onboarding evaluation | `runResearchCase` → `writeDiscoveredProfiles` → `applyProfileLinkDecisions` remains a separate evaluation writer; no live route caller found. Do not run it against shared data as prevention acceptance. |
| Existing stored IDs and Latest snapshots | Unchanged. Wrong existing anchors can still produce mutually matching accounts of the wrong artist; separate record review/cleanup required. |

“Look again” and research pumps already call MusicNerdAPI's refresh/advance endpoints.
Their configured base is production API when `NEXT_PUBLIC_VERCEL_ENV=production`;
otherwise staging API, with an optional non-production preview override. This does
not reroute the legacy source-search action. Source inspection establishes routing
on main, not the deployed production SHA, configuration or observed traffic.
