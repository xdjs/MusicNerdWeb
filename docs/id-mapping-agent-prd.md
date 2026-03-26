# Cross-Platform Artist ID Mapping Agent — PRD

> Depends on: `docs/id-mapping-infrastructure-plan.md` (DB table + MCP tools must be deployed first)

## Problem

MusicNerdWeb has ~N artists, each identified by a Spotify ID and name. To migrate off the Spotify API (starting with Deezer), we need to resolve each artist's equivalent ID on other platforms. No single lookup method works for all artists — Wikidata covers well-known artists, MusicBrainz fills gaps, and direct platform search handles the long tail. An automated agent should work through these tiers methodically, making judgment calls on ambiguous matches.

## Agent Overview

The resolution agent is a prompt-driven AI agent that:
1. Connects to the MusicNerd MCP server for database reads/writes
2. Makes HTTP requests to public APIs (Wikidata, MusicBrainz, Deezer)
3. Works through a tiered resolution strategy, highest-confidence sources first
4. Records results via `resolve_artist_id` with confidence levels and reasoning
5. Operates in fixed batches (50-100 artists per session), resumable across sessions

## Scope

- **One platform at a time.** Start with Deezer. When Deezer coverage is satisfactory, run again targeting Apple Music, etc.
- **Opportunistic cross-platform saves.** Tier 1 (Wikidata) returns multiple platform IDs in one query. The agent should save all IDs found, even for platforms that aren't the current target.
- **Conservative on ambiguity.** If the agent isn't confident in a match, skip it. Unresolved artists accumulate for manual review. Accuracy over coverage.

## Session Lifecycle

```
1. Call get_mapping_stats → understand current state
2. Call get_unmapped_artists(platform, limit=50) → get work batch
3. For each artist in batch:
   a. Attempt Tier 1 (Wikidata)
   b. If unresolved, attempt Tier 2 (MusicBrainz)
   c. If unresolved, attempt Tier 3 (platform name search)
   d. If still unresolved, skip
4. Call get_mapping_stats → report progress
5. Exit
```

The agent is **stateless between sessions**. It picks up where it left off because `get_unmapped_artists` only returns artists without a mapping for the target platform.

## Tiered Resolution Strategy

### Tier 1 — Wikidata SPARQL (High Confidence)

**Why first:** Wikidata stores verified cross-platform ID mappings. A Spotify ID match is unambiguous. No rate limits. Batch-friendly.

**API:** `https://query.wikidata.org/sparql`

**Method:** POST with SPARQL query, `Accept: application/json` header, descriptive `User-Agent` header.

**Batch approach:** Use a `VALUES` clause to look up multiple Spotify IDs per query (batch size ~50-100):

```sparql
SELECT ?item ?spotifyId ?deezer ?apple ?mbid ?wikidata WHERE {
  VALUES ?spotifyId { "id1" "id2" "id3" ... }
  ?item wdt:P1902 ?spotifyId .
  OPTIONAL { ?item wdt:P2722 ?deezer }
  OPTIONAL { ?item wdt:P2850 ?apple }
  OPTIONAL { ?item wdt:P434 ?mbid }
  BIND(REPLACE(STR(?item), "http://www.wikidata.org/entity/", "") AS ?wikidata)
}
```

**Wikidata property codes:**
| Property | Platform |
|----------|----------|
| `P1902` | Spotify artist ID |
| `P2722` | Deezer artist ID |
| `P2850` | Apple Music artist ID |
| `P434` | MusicBrainz artist ID |
| `P1953` | Discogs artist ID |

**On match:**
- Save the target platform ID with `confidence: "high"`, `source: "wikidata"`
- Opportunistically save any other platform IDs found (MusicBrainz, Apple Music, Wikidata entity ID, etc.) with the same confidence/source
- No reasoning text needed for high-confidence Wikidata matches

**Multi-value edge case:** Wikidata can return multiple IDs for the same platform (e.g., Girl Talk has Deezer IDs `5780` and `58072372`). When this happens:
1. Fetch each candidate from the Deezer API to verify
2. Pick the one with the most fans/albums (likely the primary profile)
3. If ambiguous, flag for review rather than guessing

**Expected hit rate:** ~40-60% of artists with Wikipedia articles

### Tier 2 — MusicBrainz Relationship Lookup (High Confidence)

**Why second:** MusicBrainz has curated, human-verified cross-platform links. Slower (1 req/sec rate limit) but high quality.

**API:** `https://musicbrainz.org/ws/2/`

**Rate limit:** 1 request per second. Must include a descriptive `User-Agent` header per MusicBrainz policy.

**Two paths:**

**Path A — Artist already has an MBID** (from Tier 1 or existing `musicbrainz` column in DB):
```
GET /ws/2/artist/{mbid}?inc=url-rels&fmt=json
```
Parse the `url` relationships array for platform URLs:
- Deezer: `https://www.deezer.com/artist/{id}`
- Apple Music: `https://music.apple.com/.../artist/.../id`
- Other platforms as available

**Path B — No MBID, search by name:**
```
GET /ws/2/artist/?query=artist:"{name}"&fmt=json&limit=5
```
Evaluate candidates by:
- Exact name match (case-insensitive)
- Disambiguation text (MusicBrainz includes context like "American rapper" or "British rock band")
- If a single strong match, fetch its relationships via Path A
- If ambiguous, skip (don't guess)

**On match:**
- `confidence: "high"`, `source: "musicbrainz"`
- Brief reasoning for Path B matches (e.g., "MusicBrainz name search: exact match, disambiguation 'American singer-songwriter'")

**Expected hit rate:** ~20-30% of remaining unresolved artists

### Tier 3 — Target Platform Name Search (Agent Judgment)

**Why last:** Direct name search has the highest coverage but lowest inherent confidence. Requires the agent to evaluate whether a search result is actually the same artist.

**API (Deezer):** `GET https://api.deezer.com/search/artist?q={name}&limit=5`

**No auth required.** Rate limit: ~50 requests per 5 seconds.

**Deezer artist object fields available for verification:**
```json
{
  "id": 123,
  "name": "Artist Name",
  "nb_album": 12,
  "nb_fan": 450000,
  "picture_xl": "https://..."
}
```

**Verification signals the agent should consider:**

1. **Name match quality:**
   - Exact match (case-insensitive) → strong signal
   - Minor variation (diacritics, "The" prefix) → acceptable
   - Significant difference → reject

2. **Fan count plausibility:**
   - The agent can fetch Spotify follower count via the existing `get_artist` MCP tool (which includes `spotifyId` — the agent can call Spotify API if needed) or use its general knowledge
   - A real match should have fans on both platforms within a reasonable range
   - A tribute band or namesake will have drastically fewer fans

3. **Album count plausibility:**
   - `nb_album` on Deezer should roughly match the artist's known discography

4. **Uniqueness of name:**
   - "Beyoncé" → name alone is sufficient (unique)
   - "Aurora" → need stronger corroborating signals (multiple artists with this name)

**Decision framework:**
- **High confidence:** Unique name + exact match, OR exact name + fan count within order of magnitude → `confidence: "high"`
- **Medium confidence:** Exact name + some corroborating signal but not conclusive → `confidence: "medium"`
- **Skip:** Ambiguous, multiple plausible candidates, or no good match → do not resolve

**On match:**
- `confidence: "high"` or `"medium"`, `source: "name_search"`
- **Reasoning is required.** The agent must explain why it chose this candidate (e.g., "Exact name match 'Bonobo', Deezer nb_fan=1.2M plausible for electronic artist with 800K Spotify followers, nb_album=8 matches known discography")

**On skip:**
- Do not call `resolve_artist_id`. The artist remains in the unmapped pool.

### Name Normalization (All Tiers)

Before comparing names across platforms:
- Case-insensitive comparison
- Unicode NFD normalization (handles diacritics: "Beyoncé" = "Beyonce")
- Strip leading "The " (handles "The Beatles" vs "Beatles")
- Strip featured artist suffixes (" feat.", " ft.", " featuring" and everything after)
- Trim whitespace

## MCP Tools Used

| Tool | Purpose | Auth Required |
|------|---------|---------------|
| `get_mapping_stats` | Check progress at start/end of session | No |
| `get_unmapped_artists` | Get batch of artists to resolve | No |
| `get_artist_mappings` | Check existing mappings for an artist | No |
| `get_artist` | Get artist details (name, spotify ID, existing links) | No |
| `resolve_artist_id` | Write a resolved mapping | Yes (MCP API key) |

## External APIs Used

| API | Auth | Rate Limit | Used In |
|-----|------|------------|---------|
| Wikidata SPARQL | None (User-Agent header) | No hard limit, polite usage | Tier 1 |
| MusicBrainz | None (User-Agent header) | 1 req/sec (enforced) | Tier 2 |
| Deezer | None | ~50 req/5s | Tier 3 |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Wikidata query fails / times out | Log error, fall through to Tier 2 for affected artists |
| MusicBrainz rate limit (503) | Wait 2 seconds, retry once. If still failing, skip to Tier 3 |
| MusicBrainz name search returns 0 results | Skip to Tier 3 |
| Deezer search returns 0 results | Skip artist (unresolved) |
| Deezer API error | Log error, skip artist |
| `resolve_artist_id` returns `skipped: true` | Normal — a higher-confidence mapping already exists. Move on. |
| `resolve_artist_id` fails | Log error, continue with next artist |
| Artist has no Spotify ID | Should not happen (`get_unmapped_artists` filters for `spotify IS NOT NULL`), but skip if encountered |

## Output / Reporting

At the end of each session, the agent should report:
- Total artists in batch
- Resolved count by tier (Tier 1 / Tier 2 / Tier 3)
- Resolved count by confidence (high / medium)
- Skipped / unresolved count
- Any errors encountered
- Updated stats from `get_mapping_stats`

## Constraints

- **No destructive operations.** The agent only creates/updates mappings. It cannot delete artists, modify artist links, or change any other data.
- **Accuracy over coverage.** A wrong mapping is worse than no mapping (it would break the Spotify→Deezer migration). When in doubt, skip.
- **Respect rate limits.** Especially MusicBrainz (1 req/sec). The agent must pace itself.
- **Idempotent sessions.** Running the agent twice on the same batch produces the same results. Already-resolved artists are naturally skipped by `get_unmapped_artists`.

## Success Criteria

| Metric | Target |
|--------|--------|
| Deezer coverage | >80% of artists with Spotify IDs mapped |
| High-confidence mappings | >90% of resolved mappings are `high` confidence |
| False positive rate | <1% (spot-check sample of medium-confidence mappings) |
| Unresolved | <20% of catalog (remainder goes to manual review) |

## Spike Validation (2026-03-11)

Tested the algorithm against 3 real artists from the dev database:

| Artist | Spotify ID | Tier 1 (Wikidata) | Tier 2 (MusicBrainz) | Tier 3 (Deezer Search) | Result |
|--------|-----------|-------------------|----------------------|------------------------|--------|
| Vybz Kartel | `2NUz5P42WqkxilbI8ocN76` | Deezer `100675`, Apple `79371544`, MBID found | — | — | Resolved Tier 1, high confidence |
| Girl Talk | `6awzBEyEEwWHOjLox1DkLr` | Deezer `5780` + `58072372` (two values!), two MBIDs | — | — | Resolved Tier 1, but multi-value edge case |
| Mejiwahn | `5nwqAZGgbbZOuK11nRCGyj` | Miss (not in Wikidata) | MBID found, but no Deezer link | Exact match, Deezer `13223383` | Resolved Tier 3, high confidence (unique name) |

### Key findings:
1. **Algorithm works end-to-end.** All 3 artists resolved successfully.
2. **Wikidata multi-value edge case:** Girl Talk returned two Deezer IDs (`5780` and `58072372`). Agent should verify each via Deezer API and pick the primary (most fans/albums), or flag for review.
3. **Tier 2 partial hits are valuable:** MusicBrainz confirmed Mejiwahn's identity (MBID) even without a Deezer link, strengthening Tier 3 confidence.
4. **Wikidata requires User-Agent header** — returns 403 without one. Agent prompt must specify this.

## Future Extensions

- **Apple Music resolution:** Same agent, different target platform parameter. Tier 1 already fetches Apple Music IDs from Wikidata. Tier 3 would call Apple Music search API (requires $99/yr developer account + JWT auth).
- **Batch `resolve_artist_id`:** If per-artist MCP calls become a bottleneck, add a batch write tool.
- **Admin review UI:** Surface unresolved artists in the admin dashboard for manual resolution.
- **Confidence upgrade runs:** Re-run Tier 1-2 periodically as Wikidata/MusicBrainz coverage improves, upgrading medium→high confidence mappings.
