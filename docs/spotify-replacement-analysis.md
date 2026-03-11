# Replacing Spotify: Apple Music & Deezer Analysis

> Analyzed 2026-03-11

## Context

We're exploring replacing Spotify as the external music data provider. This document evaluates Apple Music API and Deezer API as replacements against our current Spotify usage (see `spotify-usage-analysis.md`).

---

## Apple Music API

### Feature Mapping

| Our Spotify Usage | Apple Music Equivalent | Status |
|---|---|---|
| Artist search (`/v1/search?type=artist`) | `GET /v1/catalog/{storefront}/search?types=artists` | Available |
| Get artist (`/v1/artists/{id}`) | `GET /v1/catalog/{storefront}/artists/{id}` | Partial — returns `name`, `genreNames`, `url` but artwork is unreliable |
| Batch get artists (`/v1/artists?ids=...`) | `GET /v1/catalog/{storefront}/artists?ids=...` | Available |
| Artist image (`images[0].url`) | `artwork` attribute | **Unreliable** — often `null` for artists due to licensing. MusicKit (Swift) doesn't include it at all. |
| Follower count (`followers.total`) | None | **Not available** |
| Artist genres (`genres[]`) | `genreNames[]` | Available |
| Release count (`/artists/{id}/albums` → `total`) | `artists/{id}/albums` relationship | Available — but no `total`, must paginate to count |
| Top tracks (`/artists/{id}/top-tracks`) | `artists/{id}/view/top-songs` | Available |

### Authentication

| | Spotify | Apple Music |
|---|---|---|
| Flow | OAuth 2.0 Client Credentials | JWT signed with ES256 private key |
| Requirements | Free developer account | **$99/year Apple Developer Program** |
| Token creation | POST to `/api/token` with client_id/secret | Sign JWT locally with Team ID + Key ID + `.p8` key |
| Token lifetime | 1 hour | Up to 6 months |
| Complexity | Low | Medium |

### Rate Limits

~20 requests/second per token (community-reported, not officially documented).

### Critical Gaps

1. **Artist images** — biggest blocker. REST API doesn't reliably return artist artwork. Workaround (scraping OG meta tags) is fragile and possibly TOS-violating.
2. **No follower/popularity metric** — loses a signal for AI bio generation.
3. **No direct release count** — must paginate all albums to count.
4. **$99/year cost** — Spotify is free.
5. **Storefront requirement** — every call needs a `{storefront}` path param (e.g., `us`, `gb`), adding complexity for international users.

### Verdict

**Apple Music cannot fully replace Spotify** due to the artist image gap.

---

## Deezer API

### Feature Mapping

| Our Spotify Usage | Deezer Equivalent | Status |
|---|---|---|
| Artist search (`/v1/search?type=artist&limit=10`) | `GET /search/artist?q={query}&limit=10` | **Full replacement** — no auth needed |
| Get artist (`/v1/artists/{id}`) | `GET /artist/{id}` | **Full replacement** — `name`, `id`, `link`, `nb_album`, `nb_fan`, pictures |
| Artist images (`images[0].url`) | `picture_small`, `picture_medium`, `picture_big`, `picture_xl` | **Better** — 4 preset sizes vs Spotify's variable array |
| Batch get artists (`/v1/artists?ids=...`) | No batch endpoint | **Gap** — must use parallel individual requests |
| Follower count (`followers.total`) | `nb_fan` | **Full replacement** |
| Release count (`/artists/{id}/albums` → `total`) | `nb_album` (on artist object directly) | **Better** — no extra API call needed |
| Top tracks (`/artists/{id}/top-tracks`) | `GET /artist/{id}/top` | **Full replacement** |
| Artist genres (`genres[]`) | Not on artist object | **Gap** — genres are on albums, not artists |

### Deezer Artist Object Fields

```json
{
  "id": 123,
  "name": "Artist Name",
  "link": "https://www.deezer.com/artist/123",
  "share": "https://www.deezer.com/artist/123?utm_source=...",
  "picture": "https://api.deezer.com/artist/123/image",
  "picture_small": "https://...",
  "picture_medium": "https://...",
  "picture_big": "https://...",
  "picture_xl": "https://...",
  "nb_album": 12,
  "nb_fan": 450000,
  "radio": true,
  "tracklist": "https://api.deezer.com/artist/123/top?limit=50"
}
```

### Authentication

| | Spotify | Deezer |
|---|---|---|
| Cost | Free | Free |
| Auth for catalog reads | OAuth Client Credentials (token dance) | **None** — fully open endpoints |
| Rate limit | Undocumented, 429-based | ~50 req/5s (community-reported) |

### Advantages Over Spotify

1. **No authentication** — eliminates entire token management layer (`getSpotifyHeaders`, `unstable_cache` for tokens, `isTokenExpired`)
2. **Album count on artist object** (`nb_album`) — saves the separate `getNumberOfSpotifyReleases` API call
3. **Fan count on artist object** (`nb_fan`) — equivalent to `followers.total`
4. **Predictable image sizes** — `picture_small`/`medium`/`big`/`xl` vs Spotify's variable `images[]` array

### Gaps to Solve

1. **No batch endpoint** — search route uses Spotify's `GET /v1/artists?ids=...` (up to 50) to enrich DB results. With Deezer, fire individual requests via `Promise.all`. For 10-20 artists this is fine; may add latency at scale.
2. **No genres on artist object** — Spotify returns `genres[]` on artist; Deezer has genres on albums/genre endpoints only. Mitigations:
   - Fetch artist's first album and use its genre
   - Skip genres in bio prompt (minor quality loss)
   - Use MusicBrainz tags as secondary genre source
3. **Image storage TOS** — Deezer TOS prohibits storing images. We don't store Spotify images today (always fetched live), so this matches our current architecture.
4. **ID migration** — need to map existing Spotify IDs to Deezer IDs for all artists (see `cross-platform-id-mapping.md`).

### Verdict

**Yes, Deezer can replace Spotify for almost everything.** Simpler (no auth), two minor gaps (no batch, no artist genres) with straightforward workarounds. Biggest effort is the ID migration.

---

## Artist Image Alternatives (Standalone)

If we need images from a source other than Spotify or Deezer:

### Viable

| Source | Cost | Auth | Artist Images? | Coverage | Notes |
|---|---|---|---|---|---|
| **Deezer** | Free | None | `picture_small`/`medium`/`big`/`xl` | Massive catalog | TOS prohibits storing images (same as current Spotify usage) |
| **Fanart.tv** | Free (API key) | Project key | `artistthumb` (1000x1000), `artistbackground` (1920x1080), logos, banners | Strong for popular/mid-tier, gaps for niche | Requires MusicBrainz ID. CC-licensed. Community-curated. |
| **Wikidata + Wikimedia Commons** | Free | None (User-Agent only) | `P18` property → Commons file → image URL | Good for well-known artists, sparse for newer | Formal portraits, not stylized. Map from Spotify ID via `P1902`. |
| **TheAudioDB** | $8/mo Patreon | API key | `strArtistThumb` (1000x1000) + `/small` (200px) | Solid for popular artists | Free tier heavily restricted (30 req/min). Lookup by MBID. |

### Not Viable

| Source | Why Not |
|---|---|
| **Last.fm** | Artist images broken since ~2019. API returns empty strings or placeholder star images. |
| **Apple Music** | Artist artwork often `null` in REST API. Workaround (scraping OG tags) is fragile and legally gray. $99/yr. |
| **iTunes Search API** | Returns album artwork only — no artist images. |
| **Genius** | Has `header_image_url` but editorial/header images, not standardized profile photos. Undocumented rate limits. |

### Recommended Approach

For maximum resilience, a tiered fallback:
1. **Primary**: Deezer (or keep Spotify) for artist images
2. **Fallback**: Fanart.tv via MusicBrainz ID for high-quality or when primary fails
3. **Last resort**: Wikidata/Wikimedia Commons
