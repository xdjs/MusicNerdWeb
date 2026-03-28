# Programmatic ID Mapping & Enrichment (Tier 1 + 2) — Plan

> **Goal:** Replace the LLM-driven Wikidata and MusicBrainz lookups with a deterministic script, reducing the projected cost of mapping the remaining ~36k artists from ~$8,150 to ~$300-600. Additionally, harvest all available platform IDs and social links from Wikidata in the same pass — data that users currently add manually via UGC.

## Context

The current `agents/id-mapping/` setup uses Claude (Sonnet) for all four tiers of ID resolution. Analysis of 3,497 artists processed so far ($791.80 spent) shows:

| Tier | Source | Distinct Artists | % of Resolved |
|------|--------|-----------------|---------------|
| 1 | Wikidata | 998 | 30% |
| 2 | MusicBrainz | 928 | 28% |
| 2.5 | Web search | 894 | 27% |
| 3 | Name search | 1,223 | 37% |

Tiers 1 and 2 are **fully deterministic** — SPARQL queries, REST API calls, and string comparison. No LLM judgment is needed. The agent also runs Google cross-verification on every Tier 1/2 result (Tier 2.5), but the conflict rate is only 1.9% for Wikidata, making that verification low-ROI.

**Cost at $0.227/artist:**
- Current projection (all Sonnet): ~36k artists x $0.227 = **~$8,150**
- Programmatic T1+T2 (~21k artists at ~$0) + Claude Haiku T2.5+T3 (~15k at ~$0.02-0.04) = **~$300-600**

### Enrichment opportunity

Wikidata stores far more than Deezer IDs. A single SPARQL query can return platform IDs, social handles, and metadata — all at zero cost. Current state: only 29 of 43,021 artists have a `wikidata` column value, and the agent's SPARQL query only captures 4 of 20+ available properties.

## Architecture

```
Phase 1: programmatic-resolver.ts (this plan)

  collect command — hits external APIs, writes JSON file
    Step A — Wikidata SPARQL (batch 80, ALL artists with Spotify IDs)
      → Platform IDs: deezer, apple_music, tidal, amazon_music, youtube_music, etc.
      → Artist links: wikidata, musicbrainz, discogs, lastfm, imdb, soundcloud, youtube channel
      → Social links: x/twitter, instagram, facebook
      → Deezer verify (name match via Deezer API)

    Step B — MusicBrainz (1 req/s, only artists still missing Deezer after Step A)
      → Deezer URLs from artist relationships
      → Additional platform URLs not found in Wikidata

    Output: data/wikidata-enrichment.json

  import command — reads JSON file, bulk-writes to DB
    → artist_id_mappings (platform IDs)
    → artists table columns (social links, wikidata ID, etc.)

Phase 2: existing Claude agent (Haiku, reduced prompt)
  Google search → Deezer name search → MCP resolve
  ~15k artists, ~$300-600
```

### Key design decisions

1. **Standalone script with direct DB access.** Runs locally in tmux (like the Claude agent), but imports Drizzle ORM service functions directly — no MCP/HTTP overhead, no API key needed.

2. **Two-command workflow: collect then import.** The collect step queries external APIs and writes a JSON file. The import step reads the JSON and writes to the DB. This lets you inspect/review the data before it touches prod.

3. **All artists with Spotify IDs, not just unmapped.** The ~3,500 artists already processed by the v1 agent only got the 4-property SPARQL query. Running against all ~39k artists ensures they get enriched with the 16 new properties too. Import uses `ON CONFLICT` / only-write-if-empty semantics, so existing data is untouched.

4. **No audit logging.** The JSON file is the audit trail. Bulk-importing 100k+ rows into `mcp_audit_log` would drown out the agent activity in the admin dashboard. Future agent runs (Phase 2) still audit normally via MCP.

5. **No exclusions.** The script only writes high-confidence matches. If it can't resolve an artist, it silently leaves them for Phase 2. Only Claude (with judgment) should decide an artist is unmappable.

6. **No overwriting existing data.** Only writes to empty columns. If a user already submitted an Instagram handle via UGC, the Wikidata value is skipped. UGC takes precedence.

## Deliverables

```
agents/id-mapping/
├── programmatic-resolver.ts   # Main script — collect and import commands
├── ...existing agent files
```

Single TypeScript file, run with `npx tsx`. No build step. No new dependencies beyond what's already in the project.

## Script Design

### Entry point

```bash
# Step 1: Collect data from external APIs → JSONL file
npx tsx agents/id-mapping/programmatic-resolver.ts collect \
  --out data/wikidata-enrichment.jsonl

# (Review the JSONL file here — e.g. wc -l, spot-check entries, grep for warnings)

# Step 2: Import JSONL into DB
npx tsx agents/id-mapping/programmatic-resolver.ts import \
  --file data/wikidata-enrichment.jsonl
```

### Config (env vars)

| Var | Default | Description |
|-----|---------|-------------|
| `SUPABASE_DB_CONNECTION` | from `.env.local` | Postgres connection string (used by import step) |
| `WIKIDATA_BATCH` | `80` | Spotify IDs per SPARQL query (Wikidata has URL length limits) |
| `DRY_RUN` | `0` | Set to `1` to skip writes in import step |

No `MCP_API_KEY` or `MCP_URL` needed — the script accesses the DB directly via Drizzle.

### JSONL file format

The collect step outputs a JSONL file (one JSON object per line). Each artist is appended as it's processed, so partial progress survives crashes. A summary line is written last.

```jsonl
{"artistId":"uuid-from-musicnerd","name":"Beyoncé","spotifyId":"6vWDO969PvNqNYHIOW5v0m","source":"wikidata","wikidataId":"Q36153","mappings":{"deezer":{"id":"145","verified":true},"apple_music":{"id":"1419227"},"tidal":{"id":"1566"},"amazon_music":{"id":"B001GCXIFK"},"youtube_music":{"id":"UCuHzBCaKmtaLcRAOoaWEfQ"},"musicbrainz":{"id":"859d0860-d480-4efd-970c-c05d5f1776b8"},"genius":{"id":"568"},"allmusic":{"id":"mn0000761179"},"billboard":{"id":"beyonce"},"rolling_stone":{"id":"beyonce"}},"artistLinks":{"wikidata":"Q36153","discogs":"26063","lastfm":"Beyonc%C3%A9","soundcloud":"beyonce","imdb":"nm0461498","youtubechannel":"UCuHzBCaKmtaLcRAOoaWEfQ","x":"Beyonce","instagram":"beyonce","facebookID":"beyonce"}}
{"artistId":"uuid-2","name":"Another Artist","spotifyId":"xxx",...}
...
{"_summary":true,"collectedAt":"2026-03-28T22:00:00Z","totalArtists":39454,"wikidataMatches":22000,"musicbrainzMatches":8200,"deezerVerified":20600}
```

**Per-artist line fields:**

| Field | Description |
|-------|-------------|
| `artistId` | MusicNerd UUID |
| `name` | Artist name |
| `spotifyId` | Spotify ID (used for dedup on restart) |
| `source` | `"wikidata"`, `"musicbrainz"`, or `"both"` |
| `wikidataId` | Wikidata entity ID (e.g., `"Q36153"`) |
| `mappings` | Platform ID mappings → `artist_id_mappings` table |
| `artistLinks` | Column values → `artists` table |

The import step reads all lines, ignores the `_summary` line, and processes each artist line.
```

The import step reads this file and writes:
- `mappings` → `artist_id_mappings` table via bulk `INSERT ... ON CONFLICT DO NOTHING`
- `artistLinks` → `artists` table columns, only if currently empty
- `conflicts` → written to a separate `data/wikidata-conflicts.json` for manual review (see Conflict handling)

### Wikidata SPARQL query — expanded

The current agent fetches 4 properties. The expanded query fetches 20:

```sparql
SELECT ?item ?spotifyId
       ?deezer ?apple ?mbid ?wikidata
       ?tidal ?amazonMusic ?youtubeMusic
       ?discogs ?genius ?allmusic ?lastfm ?soundcloud
       ?billboard ?imdb ?rollingStone
       ?youtube ?twitter ?instagram ?facebook ?website
WHERE {
  VALUES ?spotifyId { "ID1" "ID2" ... }
  ?item wdt:P1902 ?spotifyId .
  BIND(REPLACE(STR(?item), "http://www.wikidata.org/entity/", "") AS ?wikidata)
  OPTIONAL { ?item wdt:P2722 ?deezer }
  OPTIONAL { ?item wdt:P2850 ?apple }
  OPTIONAL { ?item wdt:P434  ?mbid }
  OPTIONAL { ?item wdt:P7650 ?tidal }
  OPTIONAL { ?item wdt:P7400 ?amazonMusic }
  OPTIONAL { ?item wdt:P10625 ?youtubeMusic }
  OPTIONAL { ?item wdt:P1953 ?discogs }
  OPTIONAL { ?item wdt:P2373 ?genius }
  OPTIONAL { ?item wdt:P1728 ?allmusic }
  OPTIONAL { ?item wdt:P3192 ?lastfm }
  OPTIONAL { ?item wdt:P3040 ?soundcloud }
  OPTIONAL { ?item wdt:P4208 ?billboard }
  OPTIONAL { ?item wdt:P345  ?imdb }
  OPTIONAL { ?item wdt:P3017 ?rollingStone }
  OPTIONAL { ?item wdt:P2397 ?youtube }
  OPTIONAL { ?item wdt:P2002 ?twitter }
  OPTIONAL { ?item wdt:P2003 ?instagram }
  OPTIONAL { ?item wdt:P2013 ?facebook }
  OPTIONAL { ?item wdt:P856  ?website }
}
```

### Wikidata property reference

| Property | Code | Write target | Write method |
|----------|------|-------------|--------------|
| Deezer | P2722 | `artist_id_mappings` | bulk insert (after Deezer API name verify) |
| Apple Music | P2850 | `artist_id_mappings` | bulk insert |
| MusicBrainz | P434 | `artist_id_mappings` + `artists.musicbrainz` | bulk insert + column update |
| Wikidata entity | (derived) | `artists.wikidata` | column update |
| Tidal | P7650 | `artist_id_mappings` | bulk insert |
| Amazon Music | P7400 | `artist_id_mappings` | bulk insert |
| YouTube Music | P10625 | `artist_id_mappings` | bulk insert |
| Discogs | P1953 | `artists.discogs` | column update (if empty) |
| Last.fm | P3192 | `artists.lastfm` | column update (if empty) |
| SoundCloud | P3040 | `artists.soundcloud` | column update (if empty) |
| IMDb | P345 | `artists.imdb` | column update (if empty) |
| YouTube channel | P2397 | `artists.youtubechannel` | column update (if empty) |
| X/Twitter | P2002 | `artists.x` | column update (if empty) |
| Instagram | P2003 | `artists.instagram` | column update (if empty) |
| Facebook | P2013 | `artists.facebookID` (Drizzle field: `facebookId`) | column update (if empty) |
| Genius | P2373 | `artist_id_mappings` | bulk insert |
| AllMusic | P1728 | `artist_id_mappings` | bulk insert |
| Billboard | P4208 | `artist_id_mappings` | bulk insert |
| Rolling Stone | P3017 | `artist_id_mappings` | bulk insert |
| Official website | P856 | (logged in JSONL only) | skip import |

**Note on new platform values:** The `platform` column in `artist_id_mappings` is freeform `text()` — no enum or check constraint. New values like `genius`, `allmusic`, `billboard`, `rolling_stone` can be inserted without a schema migration. The `VALID_MAPPING_PLATFORMS` set in `idMappingService.ts` will need updating to include these platforms so `get_unmapped_artists` recognizes them.

### Collect step flow

```
1. LOAD — Query DB directly for all artists with Spotify IDs
   SELECT id, name, spotify FROM artists WHERE spotify IS NOT NULL AND spotify != ''
   → ~39,454 artists

2. TIER 1 — Wikidata SPARQL (batch, expanded)
   For each chunk of WIKIDATA_BATCH (80) artists:
     a. Build expanded SPARQL query with VALUES clause
     b. POST to query.wikidata.org/sparql (User-Agent required)
     c. Parse results — for each artist with a Wikidata match:

        Platform IDs (→ mappings in JSON):
        - Deezer: verify name via Deezer API first, skip on mismatch
        - All others: save directly (no verification needed)

        Artist links (→ artistLinks in JSON):
        - Wikidata entity ID: always save
        - MusicBrainz, Discogs, Last.fm, SoundCloud, IMDb: save
        - YouTube channel, X/Twitter, Instagram, Facebook: save

   → Log per batch: match count + property counts

3. TIER 2 — MusicBrainz (sequential, 1 req/s)
   Only for artists still missing a Deezer ID after Tier 1:
     a. If MBID known (from Wikidata step): fetch relationships
        GET musicbrainz.org/ws/2/artist/{mbid}?inc=url-rels&fmt=json
     b. Else: name search
        GET musicbrainz.org/ws/2/artist/?query=artist:"{name}"&fmt=json&limit=5
        - Require exact name match (after normalization)
        - Reject ambiguous results (multiple plausible candidates)
        - On single match: fetch relationships via Path A
     c. Parse relations for Deezer URL → extract numeric ID
     d. Verify via Deezer API (same as Tier 1)
     e. If match: add to artist's mappings in JSON
     f. Also harvest any other platform URLs from relations
   → Respect 1 req/s rate limit (mandatory)
   → Log progress every 100 artists

4. WRITE JSON
   Write the complete results to the output file.
   → Log: summary stats
```

### Import step flow

```
1. READ JSON file + current DB state
   Parse JSON. Query artists table for current column values (needed for conflict detection).

2. BULK INSERT — artist_id_mappings
   For all mappings across all artists:
   INSERT INTO artist_id_mappings (artist_id, platform, platform_id, confidence, source, ...)
   VALUES ...
   ON CONFLICT (artist_id, platform) DO NOTHING
   → Existing mappings (from v1 agent) are untouched.
   → Also respects (platform, platform_id) unique constraint.

3. COLUMN UPDATES — artists table
   For each artist with artistLinks data, compare Wikidata value vs current DB value:
   a. Column is empty → write the Wikidata value
   b. Column matches Wikidata → no-op
   c. Column differs from Wikidata → skip write, record conflict
   → Batched into chunked UPDATE statements for performance.

4. WRITE CONFLICTS FILE
   Write all conflicts to data/wikidata-conflicts.json (see Conflict handling).

5. WRITE IMPORT SUMMARY TO DB
   Insert a single row into mcp_audit_log (or a dedicated batch_imports table) recording:
   - action: "bulk_import"
   - source file name and line count
   - mappings inserted/skipped per platform
   - columns updated/skipped/conflicted
   - timestamp
   This is a permanent record of what the import did, in case the local JSONL file is lost.

6. SUMMARY
   Print counts: mappings inserted, columns updated, conflicts found, skipped.
```

### Conflict handling

When the import step finds an artist column that already has a value **different** from what Wikidata returned, it skips the write and logs the conflict. All conflicts are written to a separate file for manual review.

**Conflict file format** (`data/wikidata-conflicts.json`):

```json
{
  "generatedAt": "2026-03-29T00:00:00Z",
  "totalConflicts": 47,
  "conflicts": [
    {
      "artistId": "uuid",
      "artistName": "Some Artist",
      "field": "instagram",
      "currentValue": "oldhandle",
      "wikidataValue": "newhandle",
      "wikidataEntityId": "Q12345"
    }
  ]
}
```

**Processing conflicts (later, manually or scripted):**
- Review the file — many will be outdated Wikidata entries or outdated UGC
- For obvious Wikidata wins (e.g., DB has a dead link, Wikidata has the current handle), update via a simple script or admin UI
- For ambiguous cases, leave as-is — the current value stays

The conflicts file is informational. The import step never overwrites — it only writes to empty columns.

### Name normalization (match existing agent logic)

```typescript
function normalizeName(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .toLowerCase()
    .replace(/^the\s+/, "")                              // strip "The "
    .replace(/\s+(feat\.?|ft\.?|featuring)\s+.*/i, "")   // strip featured artists
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}
```

### Wikidata multi-match deduplication

A Spotify ID could match multiple Wikidata entities (data quality issues, band/solo artist overlap, etc.). When the SPARQL query returns multiple rows for the same `spotifyId`:

- **Drop all rows for that Spotify ID** — don't guess which entity is correct.
- **Log a warning:** `[WARN] Spotify ID xxx matched 2 Wikidata entities (Q123, Q456) — skipping`
- The artist falls through to Phase 2 where Claude can evaluate the ambiguity.

In practice this should be very rare — Wikidata's Spotify ID property (P1902) has uniqueness constraints. But the script must handle it defensively.

### Error handling

| Scenario | Behavior |
|----------|----------|
| Wikidata 403/timeout | Retry once after 5s, then skip batch (log warning) |
| Wikidata multi-match (same Spotify ID) | Skip artist, log warning (see above) |
| MusicBrainz 503 (rate limit) | Wait 2s, retry once. If still failing, skip artist |
| Deezer API error | Skip verification for that artist (don't resolve without verify) |
| Network error | Retry once, then skip |
| Import constraint violation | `ON CONFLICT DO NOTHING` — silently skip |

### Resumability

**Collect step:** Uses JSONL format (one JSON object per line) instead of a single JSON file. Each artist's results are appended as they're processed, so a crash preserves all prior progress. On restart, the script reads the existing JSONL file, builds a set of already-processed Spotify IDs, and skips them. The header/stats line is written last.

The JSONL approach is essential given the 7-hour MusicBrainz phase — a crash at hour 6 without it would lose everything.

**Import step:** Naturally idempotent. `ON CONFLICT DO NOTHING` for mappings, only-if-empty for artist columns. Re-running the import on the same JSONL file is a no-op.

### Progress output

```
$ npx tsx programmatic-resolver.ts collect --out data/wikidata-enrichment.json

[15:30:01] Loaded 39,454 artists with Spotify IDs
[15:30:01] Tier 1: Wikidata SPARQL — 494 batches of 80
[15:30:05] Tier 1: batch 1/494 — 52 matched, 23 deezer verified
[15:30:09] Tier 1: batch 2/494 — 48 matched, 19 deezer verified
...
[15:40:00] Tier 1 complete: 22,000 Wikidata matches, 12,400 deezer verified
[15:40:00] Tier 2: MusicBrainz — 27,054 artists need Deezer (est. ~7.5h at 1 req/s)
[15:40:01] Tier 2: [100/27054] 34 deezer resolved
...
[23:10:00] Tier 2 complete: 8,200 deezer resolved
[23:10:01] Writing data/wikidata-enrichment.json (39,454 artists)...
[23:10:03] Done. File size: 42MB

=== Collect Summary ===
Duration:          7h 40m
Wikidata matches:  22,000 / 39,454 (55.8%)
Deezer resolved:   20,600 (Wikidata: 12,400 + MusicBrainz: 8,200)
Remaining for Claude: ~15,354 artists

$ npx tsx programmatic-resolver.ts import --file data/wikidata-enrichment.json

[23:15:00] Reading data/wikidata-enrichment.json — 39,454 artists
[23:15:01] Inserting platform ID mappings...
[23:15:08] Inserted 95,200 mappings (42,300 new, 52,900 skipped — already existed)
[23:15:08] Updating artist columns...
[23:15:15] Updated 112,400 columns across 22,000 artists
[23:15:15] Conflicts: 47 (written to data/wikidata-conflicts.json)
[23:15:15] Skipped: 34,153 (column already matches or empty)

=== Import Summary ===
Platform ID mappings written (artist_id_mappings):
  deezer:        20,600 (12,400 new)
  apple_music:   18,200 (15,800 new)
  tidal:          9,400 (9,400 new)
  amazon_music:   7,100 (7,100 new)
  youtube_music:  8,800 (8,800 new)
  musicbrainz:   16,500 (3,200 new)
  wikidata:      22,000 (20,786 new)
  genius:        14,300 (14,300 new)
  allmusic:       9,100 (9,100 new)
  billboard:      8,200 (8,200 new)
  rolling_stone:  6,400 (6,400 new)

Artist link enrichments (artists table, only empty columns):
  wikidata:      22,000 (21,971 new — was 29)
  musicbrainz:    4,200 new
  discogs:       12,100 new
  lastfm:        11,800 new
  soundcloud:     8,400 new
  imdb:           7,200 new
  youtubechannel: 9,600 new
  x:             14,100 new
  instagram:     13,800 new
  facebook:      11,200 new
```

## Phase 2 — Claude agent for remaining artists

After Phase 1 completes, restart the existing Claude agents for the ~15k artists that Wikidata/MusicBrainz couldn't resolve. These are the harder cases that need LLM judgment (Google search + Deezer name matching).

### Changes from v1 agent

1. **Switch model to Haiku** — Tier 2.5 (Google search evaluation) and Tier 3 (name matching) are pattern matching, not deep reasoning. Haiku is ~12x cheaper.

```bash
MODEL=haiku ./agents/id-mapping/run-full-catalog.sh
```

2. **Simplify prompt (optional)** — Strip Tier 1 and Tier 2 instructions from `prompt.md` since the remaining artists already failed those tiers. Could create a `prompt-phase2.md` that only covers Tiers 2.5 + 3, reducing input tokens per batch.

3. **Consider dropping cross-verification (optional)** — The Tier 2.5 Google cross-verification runs for every resolved artist. Could make it optional via an env var if cost is still too high.

## Runtime estimate

| Phase | Bottleneck | Estimated duration |
|-------|------------|--------------------|
| Collect: Tier 1 (Wikidata) | Network I/O, ~1s per batch of 80 | ~8 min |
| Collect: Tier 2 (MusicBrainz) | 1 req/s rate limit | ~6-7 hours |
| Import | Bulk SQL | ~30 seconds |
| **Total Phase 1** | | **~7 hours** |
| Phase 2 (Claude Haiku) | LLM throughput | ~3-5 days (2 workers) |

MusicBrainz is the bottleneck. Could be parallelized with multiple IPs but not worth the complexity — 7 hours is fine for a one-time run.

## Risks

1. **Wikidata coverage may be lower for remaining artists.** The first 3,497 artists may have been biased toward popular artists with better Wikidata coverage. The 58% ratio could drop to 40-50% for the remaining catalog. Even at 40%, the savings are still ~$4,000.

2. **MusicBrainz rate limiting.** Exceeding 1 req/s gets your IP blocked. The script must strictly enforce this. Use `await sleep(1000)` between requests.

3. **Deezer API availability.** Deezer's free API is occasionally flaky. Retry logic handles this.

4. **Name normalization edge cases.** The programmatic name comparison is less flexible than an LLM. Some legitimate matches (e.g., "KAYTRANADA" vs "Kaytranada") will be caught by case-insensitive comparison, but others (e.g., "Lil Uzi Vert" vs "Lil Uzi Vert ◊◊◊") won't. These fall through to Phase 2 — acceptable.

5. **Stale social handles.** Wikidata social handles may be outdated (artist changed their Twitter handle, deleted their Instagram, etc.). Since we only write to empty columns, we're not overwriting known-good UGC data. But some Wikidata values may be wrong. Acceptable for a first pass — users can correct via UGC.

## Non-goals

- **No exclusions.** The script only writes high-confidence matches. If it can't resolve, it silently leaves the artist for Phase 2. Only Claude (with judgment) should decide an artist is unmappable.
- **No Tier 2.5/3.** Web search and fuzzy name matching require LLM judgment.
- **No overwriting existing data.** Only writes to empty columns. Conflicts (DB value differs from Wikidata) are logged to `data/wikidata-conflicts.json` for manual review.
- **No audit logging.** The JSON file is the audit trail. Avoids flooding `mcp_audit_log` with 100k+ bulk rows that would drown out agent activity in the admin dashboard.
- **No admin UI integration.** Runs locally in tmux. Admin UI trigger/progress could be added later but is not needed for a one-time run.
- **No metadata (genres, awards, labels).** The SPARQL query could fetch these, but there are no columns on the `artists` table. Future enrichment could add metadata after schema changes.
