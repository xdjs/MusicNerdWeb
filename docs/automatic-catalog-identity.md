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
| Web/API MCP `resolve_artist_id` | Follow-up below: every persisted Deezer insert/update requires fresh reciprocal proof and a locked unchanged snapshot. Caller labels, including `manual`, are not owner confirmation. Other mapping platforms are unchanged. |
| Approved UGC | Existing approval boundary, unchanged. This patch does not certify semantic correctness of approved IDs. |
| Web directory creation | Submitted provider identity is validated; the extra provider uses the existing reciprocal Wikidata/MusicBrainz resolver plus exact target-ID and normalized-name checks. That separate resolver is unchanged. |
| Legacy Web onboarding evaluation | `runResearchCase` → `writeDiscoveredProfiles` → `applyProfileLinkDecisions` remains a separate evaluation writer; no live route caller found. Do not run it against shared data as prevention acceptance. |
| Existing stored IDs and Latest snapshots | Unchanged. Wrong existing anchors can still produce mutually matching accounts of the wrong artist; separate record review/cleanup required. |

“Look again” and research pumps already call MusicNerdAPI's refresh/advance endpoints.
Their configured base is production API when `NEXT_PUBLIC_VERCEL_ENV=production`;
otherwise staging API, with an optional non-production preview override. This does
not reroute the legacy source-search action. Source inspection establishes routing
on main, not the deployed production SHA, configuration or observed traffic.

## October 22 integration path

This local refresh of Web1588 starts from main `c23e95b1`. The legacy editor source-search path remains active and retains this guard until Sweetman's #1589 API cutover. The paired API62 refresh preserves current API main's submitted-URL auditing and caller transactions with automatic evidence in the final argument. API85 already carries the earlier guards; its owner must consume the reconciled prerequisite and remove duplicates before merging. This refresh does not activate the #1589 client or change migration/source writers.

## MCP mapping follow-up

The API-key-only `resolve_artist_id` contract has no artist-owner confirmation evidence. Its source, confidence and reasoning fields are caller assertions, including `manual`. Every actual Deezer mapping insert or update therefore requires the same fresh unique Spotify/Deezer pair corroboration. This includes same-ID confidence, source and reasoning updates; a confidence upgrade can make a retained candidate active again. A lower-confidence skipped request persists nothing and does not query the provider. Other supported mapping platforms and authenticated owner/direct link-edit paths keep their existing behavior; Spotify is not a supported mapping target and is not added.

Verification runs after current collision and confidence checks in the existing mapping transaction. Before persistence, a conditional `SELECT ... FOR UPDATE` locks the artist row only if both observed catalog slots still match. The existing artist/platform advisory lock serializes mapping writers; the row lock holds the verified catalog snapshot through commit. Missing/ambiguous/unavailable proof or changed slots reject without mapping persistence. The reused public lookup is bounded to four seconds; it adds that bounded network wait to a mapping transaction. No migrations, fallback name matching or new credentials are introduced.

Regressions reconstruct the public Rnd1/RNDN IDs and observed `name_search`/`medium` metadata including the captured stored reasoning, with mocked provider responses. They do not assert the current live Wikidata answer or prove the original first-class link-write path. Snapshot-change tests use an in-transaction simulated row change, not real concurrent PostgreSQL sessions. The existing bad mapping and link are not corrected by this code.
