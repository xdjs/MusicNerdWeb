# Admin Dashboard — Artist Data Tab

> **Goal:** Add a new tab to the admin dashboard that provides visibility into artist data coverage across all platforms, social links, and data completeness. Complements the existing Agent Work tab (which focuses on agent activity) with a data-centric view.

## Context

The current admin dashboard has tabs for UGC, Users, MCP Keys, and Agent Work. The Agent Work tab shows platform coverage for `artist_id_mappings` (7 platforms), but there's no visibility into:
- How populated the `artists` table columns are (social links, platform handles)
- Overall data completeness per artist
- Enrichment readiness (how many artists can be enriched via Wikidata)

With the programmatic enrichment script about to populate 20+ data points across ~39k artists, we need a way to see the before/after impact.

## Sections

### 1. Platform ID Coverage

Coverage of cross-platform ID mappings from the `artist_id_mappings` table. Same card grid style as the Agent Work tab's Platform Coverage section, but expanded to include all platforms.

**Data source:** `artist_id_mappings` grouped by platform, denominator = total artists with Spotify ID.

**Platforms:**

| Platform | Currently tracked | New (from enrichment) |
|----------|:-:|:-:|
| deezer | yes | |
| apple_music | yes | |
| musicbrainz | yes | |
| wikidata | yes | |
| tidal | yes | |
| amazon_music | yes | |
| youtube_music | yes | |
| genius | | yes |
| allmusic | | yes |
| billboard | | yes |
| rolling_stone | | yes |

**Card contents:**
- Platform name
- Count (e.g., "3,577")
- Progress bar (% of total artists with Spotify)
- Percentage + "+N today" in green

### 2. Artist Link Coverage

Coverage of direct columns on the `artists` table. Shows how many artists have each field populated.

**Data source:** `artists` table, `COUNT(*) WHERE column IS NOT NULL AND column != ''` for each column. Denominator = total artists.

**Columns to track:**

| Column | Category |
|--------|----------|
| spotify | listen |
| instagram | social |
| x | social |
| facebook | social |
| tiktok | social |
| youtube | social |
| youtubechannel | social |
| soundcloud | listen |
| bandcamp | listen |
| discogs | reference |
| lastfm | reference |
| musicbrainz | reference |
| wikidata | reference |
| imdb | reference |
| wikipedia | reference |
| bio | content |
| linkedin | social |
| farcaster | social |
| twitch | social |
| patreon | social |

**Card contents:** Same as Section 1 — count, progress bar, percentage, "+N today". Grouped by category (social, listen, reference, content). The `todayCount` is important here — most enrichment activity shows up in artist link columns, so this section needs growth indicators during enrichment runs.

### 3. Data Completeness Distribution

Shows how "filled out" artist profiles are across the catalog. Answers: "How many artists are just a name and nothing else?"

**Data source:** For each artist, count non-null/non-empty columns from the tracked set above. Group into buckets.

**Display:** Horizontal bar chart or simple stat cards:

```
Data Completeness (43,021 artists)
  0-1 fields:   8,200 (19%)   ████
  2-3 fields:  12,400 (29%)   ██████████
  4-6 fields:  14,100 (33%)   ████████████
  7-10 fields:  6,200 (14%)   █████
  11+ fields:   2,121 (5%)    ██
```

Also show:
- Median fields per artist
- Average fields per artist

### 4. Enrichment Readiness

Shows how many artists can benefit from Wikidata-based enrichment. Useful before and after running the programmatic resolver.

**Display:** Simple stat cards:

```
Enrichment Readiness
  Has Wikidata ID:       22,000 (can be enriched further)
  Has Spotify, no Wikidata: 17,454 (need agent/manual work)
  No Spotify ID:          3,567 (no cross-platform mapping possible)
```

This section becomes more useful over time — after the enrichment script runs, it shows the impact immediately.

## Technical approach

### New files

```
src/app/admin/ArtistDataSection.tsx        # Client component (tab content)
src/server/utils/queries/artistDataQueries.ts  # DB queries
src/app/api/admin/artist-data/route.ts     # API endpoint
```

### API design

Single endpoint: `GET /api/admin/artist-data`

Returns all four sections in one response (all queries are simple `COUNT` aggregations — fast even on 43k rows):

```typescript
interface ArtistDataSummary {
  totalArtists: number;
  totalWithSpotify: number;

  // Section 1
  platformIdCoverage: {
    platform: string;
    count: number;
    percentage: number;
    todayCount: number;
  }[];

  // Section 2
  artistLinkCoverage: {
    column: string;
    category: "social" | "listen" | "reference" | "content";
    count: number;
    percentage: number;
    todayCount: number;
  }[];

  // Section 3
  completenessDistribution: {
    bucket: string;       // "0-1", "2-3", "4-6", "7-10", "11+"
    count: number;
    percentage: number;
  }[];
  medianFields: number;
  averageFields: number;

  // Section 4
  enrichmentReadiness: {
    hasWikidata: number;
    hasSpotifyNoWikidata: number;
    noSpotify: number;
  };
}
```

### Admin tab registration

Add "Artist Data" to `AdminTabs.tsx` alongside UGC, Users, MCP Keys, Agent Work.

### Queries

All queries are simple aggregations — no joins, no pagination, no heavy computation:

```sql
-- Section 1: Platform ID coverage (reuse existing getMappingStats)
SELECT platform, COUNT(*)::int AS count
FROM artist_id_mappings
GROUP BY platform;

-- Section 2: Artist link coverage (one query, multiple COUNTs)
SELECT
  COUNT(*) FILTER (WHERE spotify IS NOT NULL AND spotify != '')::int AS spotify,
  COUNT(*) FILTER (WHERE instagram IS NOT NULL AND instagram != '')::int AS instagram,
  COUNT(*) FILTER (WHERE x IS NOT NULL AND x != '')::int AS x,
  -- ...etc for each column
FROM artists;

-- Section 3: Completeness distribution
-- Compute per-artist field count, then bucket
SELECT bucket, count FROM (
  SELECT
    CASE
      WHEN field_count <= 1 THEN '0-1'
      WHEN field_count <= 3 THEN '2-3'
      WHEN field_count <= 6 THEN '4-6'
      WHEN field_count <= 10 THEN '7-10'
      ELSE '11+'
    END AS bucket,
    CASE
      WHEN field_count <= 1 THEN 1
      WHEN field_count <= 3 THEN 2
      WHEN field_count <= 6 THEN 3
      WHEN field_count <= 10 THEN 4
      ELSE 5
    END AS sort_order,
    COUNT(*)::int AS count
  FROM (
    SELECT id,
      (CASE WHEN spotify IS NOT NULL AND spotify != '' THEN 1 ELSE 0 END +
       CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 ELSE 0 END +
       -- ...etc
      ) AS field_count
    FROM artists
  ) sub
  GROUP BY 1, 2
) bucketed
ORDER BY sort_order;

-- Section 4: Enrichment readiness
SELECT
  COUNT(*) FILTER (WHERE wikidata IS NOT NULL AND wikidata != '')::int AS has_wikidata,
  COUNT(*) FILTER (WHERE spotify IS NOT NULL AND spotify != '' AND (wikidata IS NULL OR wikidata = ''))::int AS has_spotify_no_wikidata,
  COUNT(*) FILTER (WHERE spotify IS NULL OR spotify = '')::int AS no_spotify
FROM artists;
```

## Design

Follow the existing admin tab patterns:
- Same purple accent color (`#9b83a0`) for section headings
- Card grid layout (same as Agent Work's Platform Coverage)
- Group Section 2 cards by category with subtle sub-headings
- Section 3 as horizontal bars or a simple table
- Section 4 as 3 large stat cards
- Manual refresh button as default. Opt-in auto-poll toggle (like the Agent Work tab's Live/Paused button) for active enrichment runs — polls every 30 seconds when enabled. Section 3 (completeness distribution) is the heaviest query, so consider caching server-side for 60s.
