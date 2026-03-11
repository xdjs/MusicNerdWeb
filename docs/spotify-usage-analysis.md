# Spotify API Usage Analysis

> Analyzed 2026-03-11

## Overview

MusicNerdWeb uses the Spotify Web API (Client Credentials flow) for artist search, images, metadata, and AI bio generation. All calls go through `axios` from `src/server/utils/queries/externalApiQueries.ts`.

## Authentication

- **Flow**: OAuth 2.0 Client Credentials — `POST https://accounts.spotify.com/api/token`
- **Credentials**: `NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID` / `NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET` (validated in `src/env.ts`)
- **Token caching**: `unstable_cache` with tag `spotify-headers`, revalidate 3300s (55 min, just under 60-min expiry)
- **Proactive refresh**: `isTokenExpired()` (line 75) checks if token expires within 5 minutes before each `getSpotifyArtist` call
- **Custom header**: Token expiry stored as `x-token-expiry` (unix-ms) on the cached headers object

## Spotify Endpoints Called

| Function | Endpoint | Data Used | Called From |
|---|---|---|---|
| `getSpotifyArtist` | `GET /v1/artists/{id}` | name, id, images, followers.total, genres, uri, external_urls | bio generation, add-artist page, add-artist server action, `getSpotifyData` API |
| `getSpotifyImage` | `GET /v1/artists/{id}` (reads `images[0].url` only) | first image URL | artist profile page, `recentEdited` API |
| `getSpotifyArtists` | `GET /v1/artists?ids={comma-list}` (max 50/chunk) | array of full artist objects | `searchArtists` route (DB artist enrichment), `getSpotifyData` batch API |
| `getNumberOfSpotifyReleases` | `GET /v1/artists/{id}/albums?include_groups=album,single` | `total` count | artist profile page, bio generation |
| `getArtistTopTrack` | `GET /v1/artists/{id}/top-tracks` | `tracks[0].id` | `artistBioQuery.ts` |
| `getArtistTopTrackName` | `GET /v1/artists/{id}/top-tracks` | `tracks[0].name` | `artistBioQuery.ts` (bio prompt) |
| Inline in search route | `GET /v1/search?q={query}&type=artist&limit=10` | items array of SpotifyArtist objects | search bar dropdown |

**Note**: `getSpotifyImage` and `getSpotifyArtist` both call `GET /v1/artists/{id}` but are cached independently.

## Data Flow

### Adding a New Artist (search path)

1. `SearchBar.tsx` (client) debounces 200ms, POSTs to `/api/searchArtists`
2. `searchArtists/route.ts` runs `searchForArtistByName(query)` (DB trigram) + `getSpotifyHeaders()` in parallel
3. Calls `GET /v1/search?q=...&type=artist&limit=10` and merges with DB results
4. Batches DB result Spotify IDs via `GET /v1/artists?ids=...` for live images
5. Results returned; Spotify-only artists shown with `isSpotifyOnly: true`, `id: null`
6. On click, `addArtist` server action validates via `getSpotifyArtist(spotifyId)`
7. `artistQueries.ts::addArtist` inserts `{ spotify: spotifyId, name, lcname, addedBy }`
8. Only **name** and **spotifyId** persisted at creation — no image, genre, or follower data stored

### Artist Page Render

`src/app/artist/[id]/page.tsx` fetches in parallel:
- `getSpotifyImage(artist.spotify)` — profile photo
- `getNumberOfSpotifyReleases(artist.spotify)` — "N releases on Spotify" line
- Image URL is **never stored** — fetched live every render (cached 24h via `unstable_cache`)

### Bio Generation (`/api/artistBio/[id]`)

`artistBioQuery.ts::getOpenAIBio` assembles:
- `getSpotifyArtist` → name, followers, genres
- `getNumberOfSpotifyReleases` → release count
- `getArtistTopTrackName` → top track name

All passed to OpenAI. Result stored in `artists.bio`.

### Search Merge Algorithm

Three-phase pipeline in `/api/searchArtists`:

1. **Parallel kickoff**: DB trigram search + Spotify token fetch
2. **Two Spotify calls**: search API + batch artist fetch for DB result images
3. **Merge + sort** by: match score (exact=0, starts-with=1, contains=2, other=3), bookmark status, link count, alphabetical fallback. Spotify-only results sort below DB matches.

## Caching

### Next.js `unstable_cache` (server-side, per deployment)

| Function | Cache Tag | Revalidate |
|---|---|---|
| `getSpotifyHeaders` | `spotify-headers` | 3300s (55 min) |
| `getSpotifyArtist` | `spotify-artist` | 86400s (24 h) |
| `getSpotifyImage` | `spotify-image` | 86400s (24 h) |
| `getNumberOfSpotifyReleases` | `spotify-releases` | 86400s (24 h) |
| `getArtistTopTrack` / `getArtistTopTrackName` | `spotify-top-track` | 86400s (24 h) |

Resets on serverless cold starts; not shared across workers.

### In-Memory Map Cache (search route)

Module-level `Map<string, { results, timestamp }>` with 5-minute TTL. Key: `"${query}|${sortedBookmarkedIds}"`. Ephemeral — doesn't survive restarts.

## Error Handling

| Function | Strategy |
|---|---|
| `getSpotifyArtist` | Explicit handling: 404 → invalid ID, 401 → auth failed, 429 → rate limit, network error → message. Returns `{ error, data: null }` |
| `getSpotifyImage` | Silent degradation — returns `{ artistImage: "", artistId }` on any error |
| `getNumberOfSpotifyReleases` | Returns `0` on failure |
| `getArtistTopTrackName` | Returns `null` on failure |
| Search route | Catches Spotify failures, continues with DB-only results |
| `artistBioQuery.ts` | Uses `Promise.allSettled` — individual Spotify failures don't block others |

## Rate Limiting

No Spotify-specific client-side rate limiting. Protection relies on:
1. `unstable_cache` (24h) avoiding redundant calls
2. In-memory 5-minute search cache
3. Proactive token refresh to avoid 401s
4. 429 from Spotify is propagated as error (no retry/backoff)

App-level rate limiter (`src/middleware.ts`) applies to inbound requests to `/api/getSpotifyData` (60 req/min default), not outbound Spotify calls.

## What's Stored vs. Fetched Live

### Stored in `artists` Table (written once)

| Column | When Written |
|---|---|
| `spotify` (Spotify Artist ID) | At `addArtist()` time |
| `spotifyusername` | Via UGC submission / admin approval |
| `name` / `lcname` | Sourced from Spotify at creation |
| `bio` | After OpenAI generation |

### Always Fetched Live (never persisted)

| Data | Function | Purpose |
|---|---|---|
| Profile image | `getSpotifyImage` | Artist page, OG metadata, search results, `recentEdited` |
| Follower count | `getSpotifyArtist` | Bio generation prompt |
| Genre tags | `getSpotifyArtist` | Bio generation prompt |
| Release count | `getNumberOfSpotifyReleases` | Artist page display + bio prompt |
| Top track name/ID | `getArtistTopTrackName` | Bio generation prompt |
| Search results | Inline in search route | Dropdown for artists not in DB |

**Images are the most frequently fetched live data point** — hit on every artist page load, OG metadata generation, and search enrichment.

## Key Files

- `src/server/utils/queries/externalApiQueries.ts` — all Spotify API calls, token management, caching
- `src/app/api/searchArtists/route.ts` — combined DB + Spotify search pipeline
- `src/server/utils/queries/artistQueries.ts` — `addArtist()` (DB insertion), `getAllSpotifyIds()`
- `src/app/actions/addArtist.ts` — server action entry point
- `src/app/artist/[id]/page.tsx` — consumes `getSpotifyImage` + `getNumberOfSpotifyReleases`
- `src/server/utils/queries/artistBioQuery.ts` — bio generation using Spotify data
- `src/app/api/getSpotifyData/route.ts` — public proxy for single/batch Spotify lookups
- `src/app/_components/nav/components/SearchBar.tsx` — client search UI + Spotify-only result handling
- `src/env.ts` — Spotify credential validation
