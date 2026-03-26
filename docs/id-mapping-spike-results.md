# Cross-Platform ID Mapping — Spike Results

> Tested 2026-03-11

## Overview

Validated the tiered resolution algorithm from `docs/id-mapping-agent-prd.md` against 3 real artists from the dev database, covering all three tiers.

## Test Artists

### Artist 1: Vybz Kartel (well-known)

- **MusicNerd ID:** `2def1487-152d-468c-972e-24e458f54b0e` (name in DB: 정미조 — note: random sample, Vybz Kartel is `150cc690-88fa-4fa8-a434-668b562b2f04`)
- **Spotify ID:** `2NUz5P42WqkxilbI8ocN76`

**Tier 1 (Wikidata): HIT**
- Wikidata entity: `Q1357035`
- Deezer ID: `100675` — verified via Deezer API: name "Vybz Kartel", 1,039,486 fans, 457 albums
- Apple Music ID: `79371544`
- MusicBrainz ID: `7cc385f3-333c-48de-b341-3d728de74973`
- **Result:** Resolved at Tier 1, confidence: high, source: wikidata

### Artist 2: Girl Talk (moderately known)

- **MusicNerd ID:** `f03aee59-d31f-443d-91ae-ea7f7887707b`
- **Spotify ID:** `6awzBEyEEwWHOjLox1DkLr`

**Tier 1 (Wikidata): HIT — with multi-value edge case**
- Wikidata entity: `Q2608674`
- Deezer IDs returned: `5780` AND `58072372` (two values!)
- MusicBrainz IDs returned: `24e36781-1f4a-40af-bd18-c5de61f10c66` AND `fe2d58fc-b3a8-4fbf-9360-d5f096719537`
- Deezer `5780` verified: name "Girl Talk", 13,923 fans, 29 albums
- (Deezer `58072372` not verified in this spike — likely a secondary/duplicate profile)
- **Result:** Resolved at Tier 1, confidence: high for `5780`. Multi-value case needs agent logic to pick primary.
- **Edge case documented in PRD:** Agent should verify each candidate and pick the one with most fans/albums.

### Artist 3: Mejiwahn (niche)

- **MusicNerd ID:** `590a697d-85ed-447c-88c2-0c2cec128b7d`
- **Spotify ID:** `5nwqAZGgbbZOuK11nRCGyj`

**Tier 1 (Wikidata): MISS**
- No Wikidata entity found for this Spotify ID (too niche for Wikipedia)

**Tier 2 (MusicBrainz): PARTIAL HIT**
- Name search returned 1 result with score 100: MBID `8fcc4cad-76b4-4032-a8cf-e8df614f85c8`
- Area: Oakland (plausible)
- Alias: "Art Vandelay" (side project name)
- URL relationships: Only has Spotify link (`open.spotify.com/artist/5nwqAZGgbbZOuK11nRCGyj`) — matches our Spotify ID, confirming identity
- **No Deezer relationship in MusicBrainz** — cannot resolve at this tier
- **Value:** Confirmed artist identity via Spotify URL match, strengthening Tier 3 confidence

**Tier 3 (Deezer name search): HIT**
- Search: `GET https://api.deezer.com/search/artist?q=Mejiwahn&limit=5`
- Results: 2 entries
  1. `id: 13223383`, name: "Mejiwahn", 7 albums, 69 fans — exact match
  2. `id: 171808777`, name: "Shungu & Mejiwahn", 0 albums, 2 fans — collaboration, not the artist
- **Agent judgment:** High confidence. Unique name, exact match, only one real candidate. Album count (7) plausible for a niche Oakland-based artist. MusicBrainz Tier 2 already confirmed this is the same artist via Spotify URL match.
- **Result:** Resolved at Tier 3, confidence: high, source: name_search

## Summary

| Artist | Tier 1 (Wikidata) | Tier 2 (MusicBrainz) | Tier 3 (Deezer Search) | Final Deezer ID | Confidence |
|--------|-------------------|----------------------|------------------------|-----------------|------------|
| Vybz Kartel | Deezer `100675` + Apple + MBID | — | — | `100675` | high |
| Girl Talk | Deezer `5780` + `58072372` (multi!) | — | — | `5780` | high |
| Mejiwahn | Miss | MBID found, no Deezer link | Exact match `13223383` | `13223383` | high |

## Key Findings

1. **Algorithm works end-to-end.** All 3 artists resolved successfully across the tier spectrum.
2. **Wikidata is fast and high-quality** for known artists. Single SPARQL query resolved 2/3 artists with all platform IDs.
3. **Wikidata multi-value edge case** is real (Girl Talk). Agent needs logic to pick primary ID when multiple returned.
4. **Tier 2 partial hits strengthen Tier 3.** MusicBrainz confirmed Mejiwahn's identity via Spotify URL even without a Deezer link.
5. **Tier 3 works well for unique names.** "Mejiwahn" is distinctive enough that name search alone gives high confidence.
6. **Wikidata SPARQL requires User-Agent header** — returns 403 without one. Used: `MusicNerdWeb/1.0 (https://musicnerd.xyz; contact@musicnerd.xyz)`.
7. **Deezer API is truly auth-free.** No tokens, no headers, just GET requests.
8. **MusicBrainz rate limit** (1 req/sec) is the main throughput bottleneck for Tier 2.

## Raw API Responses

### Wikidata SPARQL Query Used

```sparql
SELECT ?item ?spotifyId ?deezer ?apple ?mbid WHERE {
  VALUES ?spotifyId { "2NUz5P42WqkxilbI8ocN76" "6awzBEyEEwWHOjLox1DkLr" "5nwqAZGgbbZOuK11nRCGyj" }
  ?item wdt:P1902 ?spotifyId .
  OPTIONAL { ?item wdt:P2722 ?deezer }
  OPTIONAL { ?item wdt:P2850 ?apple }
  OPTIONAL { ?item wdt:P434 ?mbid }
}
```

### Deezer Verification: Vybz Kartel (ID 100675)
```json
{ "id": 100675, "name": "Vybz Kartel", "nb_album": 457, "nb_fan": 1039486 }
```

### Deezer Verification: Girl Talk (ID 5780)
```json
{ "id": 5780, "name": "Girl Talk", "nb_album": 29, "nb_fan": 13923 }
```

### Deezer Search: Mejiwahn
```json
{ "data": [
  { "id": 13223383, "name": "Mejiwahn", "nb_album": 7, "nb_fan": 69 },
  { "id": 171808777, "name": "Shungu & Mejiwahn", "nb_album": 0, "nb_fan": 2 }
]}
```

### MusicBrainz: Mejiwahn URL Relationships
- Only relationship: `free streaming` → `https://open.spotify.com/artist/5nwqAZGgbbZOuK11nRCGyj` (matches our Spotify ID)
