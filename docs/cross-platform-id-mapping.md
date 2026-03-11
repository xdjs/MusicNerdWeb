# Cross-Platform Artist ID Mapping Algorithm

> Designed 2026-03-11

## Problem

We have ~N artists in the DB, each with a `spotify` ID. We need to find their equivalent IDs on Deezer, Apple Music, MusicBrainz, etc.

No single method is reliable for all artists. Name matching alone fails on common names ("The Band", "Prince"). We use multiple signals and only accept high-confidence matches.

## Existing Schema

The `artists` table already has columns for: `spotify`, `musicbrainz`, `wikidata`, `discogs`, `lastfm`.

New columns needed: `deezer`, `applemusic`.

## Algorithm: Tiered Resolution with Confidence Scoring

### Tier 1 — Wikidata SPARQL (fastest, most scalable)

Wikidata stores structured mappings between platform IDs:

| Property | Platform |
|---|---|
| `P1902` | Spotify artist ID |
| `P2722` | Deezer artist ID |
| `P2850` | Apple Music artist ID |
| `P434` | MusicBrainz artist ID |
| `P1953` | Discogs artist ID |

```sparql
SELECT ?item ?deezer ?apple ?mbid WHERE {
  ?item wdt:P1902 "{spotifyId}" .
  OPTIONAL { ?item wdt:P2722 ?deezer }
  OPTIONAL { ?item wdt:P2850 ?apple }
  OPTIONAL { ?item wdt:P434 ?mbid }
}
```

- **Batch**: SPARQL supports `VALUES` clauses for bulk lookups (~100 Spotify IDs per query)
- **Confidence**: HIGH — Spotify ID is unique, so a Wikidata entity with our exact ID is a verified match
- **Coverage**: ~700K musicians with Spotify IDs. Very strong for anyone with a Wikipedia article.
- **Rate limits**: No hard limit, expects polite usage (User-Agent header, reasonable pace)

### Tier 2 — MusicBrainz Relationship Lookup (high confidence)

MusicBrainz stores cross-platform IDs as "URL relationships" on artist entities. A single artist record can link to Spotify, Deezer, Apple Music, Wikidata, Discogs, and more.

```
For each artist where musicbrainz IS NOT NULL (or resolved from Tier 1):
  1. GET /ws/2/artist/{mbid}?inc=url-rels&fmt=json
  2. Parse URL relationships:
     - Deezer URL → extract Deezer ID
     - Apple Music URL → extract AM ID
     - Other platform URLs as available
  3. Confidence: HIGH (curated, human-verified linkages)
```

For artists without an MBID:
```
  1. GET /ws/2/artist/?query=artist:"{name}"&fmt=json
  2. Match by name + disambiguation
  3. Then fetch relationships for the matched MBID
```

- **Coverage**: ~2M artists with good cross-linking for established artists
- **Rate limit**: 1 req/sec (MusicBrainz policy, enforced)
- **Note**: For artists where we already have an MBID, skip the name search and go straight to relationship lookup

### Tier 3 — Target Platform Name Search + Verification (medium confidence)

For artists not found in Tier 1 or 2, search the target platform directly with multi-signal verification.

```
For each unresolved artist:
  1. Fetch full source data:
     - spotify_name = artist.name
     - spotify_followers = followers.total (from Spotify)
     - spotify_albums = release count (from Spotify)

  2. Search target platform:
     - Deezer: GET /search/artist?q={name}&limit=5
     - Apple Music: GET /v1/catalog/us/search?types=artists&term={name}&limit=5

  3. For each candidate, compute match score:

     score = 0

     a. Name matching:
        - Exact (case-insensitive):         +40
        - Fuzzy (Levenshtein ratio > 0.9):  +25
        - No match:                          SKIP

     b. Fan/follower count similarity:
        ratio = min(source_fans, target_fans) / max(source_fans, target_fans)
        - ratio > 0.3:  +30
        - ratio > 0.1:  +20
        - ratio < 0.1:  +0

     c. Album count similarity:
        - Exact match:            +20
        - |diff| <= 3:            +15
        - |diff| > 3:             +0

     d. Position bonus:
        - Top search result with same name:  +10

  4. Decision:
     - score >= 60: ACCEPT (take highest-scoring candidate)
     - score < 60:  UNRESOLVED → manual review
```

**Why fan-count ratio works**: Real matches have fans on both platforms within an order of magnitude. A false positive "Beyoncé Tribute Band" has 200 fans on Deezer vs 40M on Spotify — the ratio catches this.

### Tier 4 — Manual Review Queue

Artists unresolved after Tiers 1-3 go into a review queue. Typically:
- Very new artists (not yet in MusicBrainz/Wikidata)
- Artists with extremely common names where scoring is ambiguous
- Artists not present on the target platform at all

## Edge Case Handling

| Edge Case | Mitigation |
|---|---|
| "The" prefix ("The Beatles" vs "Beatles") | Strip leading "The " before comparing |
| Featured artist suffixes ("Artist feat. Other") | Strip " feat.", " ft.", " featuring" and everything after |
| Diacritics ("Beyoncé" vs "Beyonce") | Unicode NFD normalization before comparing |
| Multiple artists with same name | Fan-count ratio is the strongest disambiguation signal |
| Artist not on target platform | Mark as `platform_unavailable` (don't leave unresolved forever) |
| Rebranded/renamed artists | Tier 1 & 2 handle this (IDs don't change); Tier 3 may miss — goes to manual review |

## Execution Plan

```
Phase 1: Bulk Wikidata SPARQL
  - Batch 100 Spotify IDs per query
  - Expected hit rate: ~40-60% of catalog
  - Duration: minutes (fast, no rate limit)

Phase 2: MusicBrainz relationship lookups
  - For remaining unresolved + any with existing MBID
  - Rate limit: 1 req/sec
  - Expected hit rate: ~20-30% of remaining
  - Duration: depends on catalog size (1 req/sec)

Phase 3: Target platform name search + scoring
  - For remaining unresolved
  - Rate limit: ~50 req/5s (Deezer)
  - Expected hit rate: ~60-80% of remaining

Phase 4: Manual review
  - Typically <10% of total catalog
  - Surface in admin dashboard
```

## Data Model

### New Columns on `artists`

```sql
ALTER TABLE artists ADD COLUMN deezer text;
ALTER TABLE artists ADD COLUMN applemusic text;
```

### Audit/Metadata Table (optional)

For tracking how IDs were resolved and enabling reruns:

```sql
CREATE TABLE artist_id_mappings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    uuid NOT NULL REFERENCES artists(id),
  platform     text NOT NULL,   -- 'deezer', 'applemusic', etc.
  platform_id  text NOT NULL,
  confidence   text NOT NULL,   -- 'high', 'medium', 'manual'
  source       text NOT NULL,   -- 'wikidata', 'musicbrainz', 'name_search'
  resolved_at  timestamptz DEFAULT now(),
  UNIQUE (artist_id, platform)
);
```

## Notes

- This algorithm is **platform-agnostic** — the same tiers work for mapping to Deezer, Apple Music, Tidal, or any platform tracked by MusicBrainz/Wikidata.
- The Wikidata property codes are stable and well-maintained by the community.
- MusicBrainz enforces a strict 1 req/sec rate limit — plan accordingly for large catalogs.
- Consider running this as a background job / migration script, not inline during user requests.
