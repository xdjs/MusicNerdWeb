# Deezer Cutover Plan

## Context

MusicNerdWeb uses the Spotify Web API as its primary external music data provider. This plan introduces a `MusicPlatformProvider` abstraction, refactors existing Spotify code behind it, implements a Deezer provider, then migrates all consumers to an `ArtistMusicPlatformDataProvider` (Deezer primary, Spotify fallback). Finally, Spotify API code is removed entirely.

**Why the abstraction**: Instead of find-and-replace Spotify→Deezer across 10+ files, we centralize platform-specific code behind an interface. The cutover becomes: swap which provider is active. Consumer code becomes platform-agnostic.

**Coverage**: 94.4% of artists already have Deezer IDs (37,249 / 39,462).

## Decisions

- **Unmapped artists**: Spotify fallback during transition, then default avatar after cleanup
- **Embed**: Spotify embed is already removed from the UI. Delete remaining embed code (`Dashboard.tsx`, `react-spotify-embed`). No embed in the new interface.
- **Add-artist**: Deezer primary for search. Manual add accepts both Deezer and Spotify URLs
- **End goal**: Complete Spotify API removal. Keep `artists.spotify` column as artist metadata (we're music nerds, we know everything about an artist)
- **File structure**: `src/server/utils/musicPlatform/` directory

---

## Interface Design

### `src/server/utils/musicPlatform/types.ts`

```typescript
export interface MusicPlatformArtist {
  platform: 'spotify' | 'deezer';  // which platform this data came from
  platformId: string;               // ID on this platform
  name: string;
  imageUrl: string | null;          // Best available image
  followerCount: number;            // Spotify followers.total / Deezer nb_fan
  albumCount: number;               // Spotify: separate /albums call / Deezer: nb_album on artist object
  genres: string[];                 // Spotify has these / Deezer: [] (genres on albums only)
  profileUrl: string;               // e.g. https://open.spotify.com/artist/xxx
  topTrackName: string | null;      // Always a separate endpoint on both platforms
}

export interface MusicPlatformProvider {
  readonly platform: 'spotify' | 'deezer';

  /** Full artist data including top track. SpotifyProvider: 3 calls. DeezerProvider: 2 calls. */
  getArtist(id: string): Promise<MusicPlatformArtist | null>;

  /** Image only — lighter than getArtist when only image is needed. */
  getArtistImage(id: string): Promise<string | null>;

  /** Top track name — always a separate endpoint on both platforms. */
  getTopTrackName(id: string): Promise<string | null>;

  /** Search external catalog. Returns array of platform artists (without topTrackName). */
  searchArtists(query: string, limit: number): Promise<MusicPlatformArtist[]>;

  /** Batch fetch. Spotify: native batch endpoint (max 50). Deezer: Promise.all of individual calls. */
  getArtists(ids: string[]): Promise<MusicPlatformArtist[]>;
}
```

### `ArtistMusicPlatformDataProvider` — `src/server/utils/musicPlatform/artistMusicPlatformDataProvider.ts`

Takes an **Artist object** and routes to the right provider. Consumer code never picks platform IDs.

```typescript
import type { Artist } from '@/server/db/DbTypes';

export class ArtistMusicPlatformDataProvider {
  constructor(
    private primaryProvider: MusicPlatformProvider,    // Deezer
    private fallbackProvider: MusicPlatformProvider,   // Spotify (transitional)
  ) {}

  /** Full artist data — tries primary (Deezer), falls back to secondary (Spotify) */
  async getArtist(artist: Artist): Promise<MusicPlatformArtist | null>

  /** Image only — same fallback chain */
  async getArtistImage(artist: Artist): Promise<string | null>

  /** Top track — same fallback chain */
  async getTopTrackName(artist: Artist): Promise<string | null>

  /** Search — always uses primary provider (Deezer) */
  async searchArtists(query: string, limit: number): Promise<MusicPlatformArtist[]>

  /** Batch image enrichment — routes each artist to correct provider, fetches in parallel. Map keyed by artist.id (UUID). */
  async getArtistImages(artists: Artist[]): Promise<Map<string, string>>

  /** Which platform would provide data for this artist */
  getActivePlatform(artist: Artist): 'deezer' | 'spotify' | null
}
```

### Singleton export — `src/server/utils/musicPlatform/index.ts`

```typescript
export const musicPlatformData = new ArtistMusicPlatformDataProvider(
  new DeezerProvider(),
  new SpotifyProvider(),
);
export type { MusicPlatformArtist, MusicPlatformProvider } from './types';
```

Consumer code:
```typescript
import { musicPlatformData } from '@/server/utils/musicPlatform';

// Artist page — just needs image + album count
const data = await musicPlatformData.getArtist(artist);
const imageUrl = data?.imageUrl ?? null;
const numReleases = data?.albumCount ?? 0;

// Dashboard — just needs image
const image = await musicPlatformData.getArtistImage(artist);

// Bio query — needs the full MusicPlatformArtist to extract multiple fields
const data = await musicPlatformData.getArtist(artist);
// data.followerCount, data.albumCount, data.genres, data.topTrackName
```

**When does consumer code touch `MusicPlatformArtist`?**
- **Bio generation** (`artistBioQuery.ts`): reads `.followerCount`, `.albumCount`, `.genres`, `.topTrackName` to build the AI prompt. This is the only consumer that needs the full object.
- **Everything else** uses the specific methods: `getArtistImage(artist)` → `string | null`, `getArtist(artist)` → just reads `.imageUrl` and `.albumCount`.

---

## Phase 1: Interface + SpotifyProvider (refactor, no behavioral changes)

**Goal**: Create the abstraction and wrap existing Spotify code. No consumer changes.

### Files to create

| File | What |
|------|------|
| `src/server/utils/musicPlatform/types.ts` | `MusicPlatformArtist` and `MusicPlatformProvider` interface |
| `src/server/utils/musicPlatform/spotifyProvider.ts` | `SpotifyProvider implements MusicPlatformProvider`. Wraps existing functions from `externalApiQueries.ts`. Normalizes to `MusicPlatformArtist`. |
| `src/server/utils/musicPlatform/index.ts` | Re-exports (just SpotifyProvider for now) |
| `src/server/utils/musicPlatform/__tests__/spotifyProvider.test.ts` | Unit tests — mock `externalApiQueries`, verify normalization to `MusicPlatformArtist` |

### SpotifyProvider implementation notes

- `getArtist(id)`: `getSpotifyHeaders()` → `getSpotifyArtist(id, headers)` + `getNumberOfSpotifyReleases(id, headers)` + `getArtistTopTrackName(id, headers)` in parallel. Maps to `MusicPlatformArtist { platform: 'spotify', ... }`. All calls cached 24h.
- `getArtistImage(id)`: `getSpotifyHeaders()` → `getSpotifyImage(id, "", headers)`. Returns `images[0].url`.
- `getTopTrackName(id)`: `getSpotifyHeaders()` → `getArtistTopTrackName(id, headers)`.
- `searchArtists(query, limit)`: `getSpotifyHeaders()` → Spotify search API → maps to `MusicPlatformArtist[]`. `topTrackName` set to `null` (search doesn't fetch it).
- `getArtists(ids)`: `getSpotifyHeaders()` → `getSpotifyArtists(ids, headers)` → maps to array. `topTrackName` set to `null`.
- All methods return `null`/`[]`/`0` on failure (matching existing behavior).

### What does NOT change
- `externalApiQueries.ts` stays as-is (SpotifyProvider wraps it, doesn't replace it yet)
- No consumer code changes
- `getArtistWiki` stays in `externalApiQueries.ts` (not platform-specific)

---

## Phase 2: Schema + DeezerProvider + ArtistMusicPlatformDataProvider

**Goal**: Add `deezer` column, implement Deezer provider, create the artist data provider. Still no consumer changes.

### DB Migration (apply manually, then `npm run db:generate`)
```sql
ALTER TABLE artists ADD COLUMN deezer text;
CREATE UNIQUE INDEX artists_deezer_uniq ON artists (deezer) WHERE deezer IS NOT NULL;

UPDATE artists a SET deezer = m.platform_id
FROM artist_id_mappings m
WHERE m.artist_id = a.id AND m.platform = 'deezer' AND m.confidence IN ('high', 'medium', 'manual');
```

**Why include `medium` confidence**: The agent marks many mappings as `medium` (typically name-search matches with strong fan-count correlation). Excluding them would drop coverage well below the 94.4% figure. The risk of a bad `medium` mapping is low — it would show the wrong artist's image, which is correctable via the admin dashboard. The alternative (excluding `medium`) would leave a significant number of artists on the Spotify fallback path indefinitely.

### Files to create/modify

| File | What |
|------|------|
| `src/server/db/schema.ts` | Add `deezer: text()` to `artists` table + partial unique index |
| `src/server/utils/musicPlatform/deezerProvider.ts` | `DeezerProvider implements MusicPlatformProvider` |
| `src/server/utils/musicPlatform/artistMusicPlatformDataProvider.ts` | Routing + fallback logic |
| `src/server/utils/musicPlatform/index.ts` | Export `musicPlatformData` singleton |
| `src/server/utils/musicPlatform/__tests__/deezerProvider.test.ts` | Unit tests |
| `src/server/utils/musicPlatform/__tests__/artistMusicPlatformDataProvider.test.ts` | Verify fallback routing: Deezer ID → Deezer provider, Spotify only → Spotify provider, neither → null |
| `src/server/utils/artistLinkService.ts` | Add `"deezer"` to `WRITABLE_LINK_COLUMNS` and `BIO_RELEVANT_COLUMNS` |
| `urlmap` table (DB) | Add row for Deezer artist URLs so `extractArtistId()` can infer the `deezer` column from `deezer.com/artist/123` URLs. Without this, `set_artist_link` MCP tool won't route Deezer URLs correctly. |

### DeezerProvider implementation notes

No auth. `axios.get` + `unstable_cache` (24h).

- `getArtist(id)`: `GET https://api.deezer.com/artist/${id}` → maps `{ nb_fan → followerCount, nb_album → albumCount, picture_xl → imageUrl, [] → genres, platform: 'deezer' }`. Plus `GET /artist/${id}/top?limit=1` for `topTrackName`.
- `getArtistImage(id)`: Same `/artist/${id}`, extract `picture_medium` (250×250) for thumbnail contexts (search results, dashboard). `getArtist(id)` returns `picture_xl` (1000×1000) in `imageUrl` for hero/OG image use. Consumer code (`getArtistImage` vs `getArtist`) determines which size is fetched.
- `getTopTrackName(id)`: `GET https://api.deezer.com/artist/${id}/top?limit=1` → `data[0].title`.
- `searchArtists(query, limit)`: `GET https://api.deezer.com/search/artist?q=${query}&limit=${limit}` → maps `data[]`. `topTrackName: null` (search doesn't fetch it).
- `getArtists(ids)`: `Promise.all` with `p-limit` concurrency cap of 10 to stay within Deezer's ~50 req/5s rate limit. No native batch endpoint.
- Error handling: Deezer returns `{ error: { type, message, code } }` on failure. Return `null`/`[]`.

### ArtistMusicPlatformDataProvider implementation notes

- Methods take `Artist` from `@/server/db/DbTypes`
- Routing: `artist.deezer` → primary provider, fallback to `artist.spotify` → fallback provider
- `searchArtists`: always delegates to primary (Deezer)
- `getArtistImages(artists)`: groups by available ID, fetches both groups in parallel via `Promise.all`
- `getActivePlatform(artist)`: returns `'deezer'` if `artist.deezer`, else `'spotify'` if `artist.spotify`, else `null`

---

## Phase 3: Switch Consumers to ArtistMusicPlatformDataProvider

**Goal**: All data consumers use `musicPlatformData` instead of direct Spotify calls.

### Files to modify

| File | Change |
|------|--------|
| `src/app/artist/[id]/page.tsx` | Replace `getSpotifyHeaders` + `getSpotifyImage` + `getNumberOfSpotifyReleases` → `musicPlatformData.getArtist(artist)`. Use `.imageUrl` for OG + hero, `.albumCount` for release count. |
| `src/app/artist/[id]/_components/Dashboard.tsx` | Remove `react-spotify-embed` import and `<Spotify>` component. Remove embed section entirely (already not shown in UI). |
| `src/server/utils/queries/artistBioQuery.ts` | Replace Spotify data compilation (lines 20-60) with `musicPlatformData.getArtist(artist)`. Build `platformBioData` from `MusicPlatformArtist` fields. Change prompt label from "Spotify Data:" to "Music Platform Data:". |
| `src/app/api/searchArtists/route.ts` | Replace Spotify search + batch image fetch → `musicPlatformData.searchArtists(query, 10)` and `musicPlatformData.getArtistImages(dbArtists)`. Rename `isSpotifyOnly` → `isExternalOnly`. |
| `src/app/api/recentEdited/route.ts` | Replace Spotify image fetch → `musicPlatformData.getArtistImage(artist)` |
| `src/app/dashboard/page.tsx` | Replace Spotify image fetch → `musicPlatformData.getArtistImage(artist)` |
| `package.json` | Remove `react-spotify-embed` |
| ~8 test files | Update mocks and assertions |

### Key migration pattern

Before:
```typescript
const headers = await getSpotifyHeaders();
const spotifyImg = await getSpotifyImage(artist.spotify, "", headers);
const numReleases = await getNumberOfSpotifyReleases(artist.spotify, headers);
```

After:
```typescript
import { musicPlatformData } from '@/server/utils/musicPlatform';
const data = await musicPlatformData.getArtist(artist);
const imageUrl = data?.imageUrl ?? null;
const numReleases = data?.albumCount ?? 0;
```

---

## Phase 4: Search + Add-Artist Migration

**Goal**: Add-artist flow supports both Deezer and Spotify URLs. Search results from Deezer.

### Files to modify

| File | Change |
|------|--------|
| `src/app/_components/nav/components/SearchBar.tsx` | Update `SearchResult` interface: rename `isSpotifyOnly` → `isExternalOnly`, add `platform`, `platformId`. Render "View on Deezer" link. `handleAddArtist` passes Deezer ID. |
| `src/app/_components/nav/components/AddArtist.tsx` | Accept both URL formats. Deezer: `/deezer\.com\/(?:\w+\/)?artist\/(\d+)/`. Spotify: existing regex. Detect format, call appropriate add flow. |
| `src/app/actions/addArtist.ts` | Accept `{ deezerId?, spotifyId? }`. Validate via provider. Insert with appropriate column. |
| `src/server/utils/queries/artistQueries.ts` | `addArtist`: support inserting with `deezer` or `spotify` as primary ID. Dedup on both columns. |
| `src/app/add-artist/page.tsx` | Accept `?deezer=ID` (primary) or `?spotify=ID` (legacy) |
| `package.json` | Audit `querystring` usage — if only used by Spotify token code, mark for removal in Phase 5 |
| ~6 test files | Update |

---

## Phase 5: Spotify API Removal

**Goal**: Delete Spotify API code. `ArtistMusicPlatformDataProvider` becomes a thin wrapper around DeezerProvider only.

### Files to remove/modify

| File | Change |
|------|--------|
| `src/server/utils/queries/externalApiQueries.ts` | Delete entirely. |
| `src/server/utils/queries/wikiQueries.ts` | **Create** — move `getArtistWiki` here from `externalApiQueries.ts`. Update all imports. |
| `src/server/utils/musicPlatform/spotifyProvider.ts` | Delete |
| `src/server/utils/musicPlatform/artistMusicPlatformDataProvider.ts` | Remove fallback paths (only DeezerProvider remains) |
| `src/env.ts` | Remove `SPOTIFY_WEB_CLIENT_ID`, `SPOTIFY_WEB_CLIENT_SECRET` |
| `src/app/api/getSpotifyData/route.ts` | Delete |
| `package.json` | Remove `querystring` (audit usage in Phase 4 so Phase 5 is purely mechanical) |
| `CLAUDE.md` | Update tech stack, env vars, API docs |
| ~10 test files | Remove Spotify mocks |

### Keep
- `artists.spotify` column — artist metadata (we know everything about an artist)
- `artists.spotifyusername` — platform link field
- `src/app/api/findArtistBySpotifyID/route.ts` — backwards compat
- `src/app/api/findArtistByDeezerID/route.ts` — **Create** new route mirroring `findArtistBySpotifyID` but querying on `artists.deezer`. External tools/agents will need this since Deezer is now the primary platform.
- MCP transformer: expose both `spotifyId` and `deezerId`

---

## Testing Strategy

### Principle: Three layers per phase

Every phase must pass all three:
1. **CI gate**: `npm run type-check && npm run lint && npm run test && npm run build`
2. **New unit tests**: assert new code contracts
3. **E2E tests**: Playwright against running dev server, validate user-facing flows end-to-end

Existing tests must stay green throughout. Tests that mock Spotify internals are updated in the phase that changes those internals — not before, not after.

---

### Deezer API Smoke Test (run once after Phase 1, before building DeezerProvider)

**Purpose**: Validate our assumptions about Deezer API response shapes before writing the provider. Hits real Deezer API (requires network). Not part of CI — run on-demand.

**File**: `src/server/utils/musicPlatform/__tests__/deezerApiSmoke.test.ts`

**Test cases** (use known artist, e.g. Deezer ID `4495513` = FKJ):
- `GET /artist/4495513` → response has `id` (number), `name` (string), `picture_xl` (non-empty URL), `nb_fan` (number > 0), `nb_album` (number > 0), `link` (string)
- `GET /artist/4495513` → response does NOT have `genres` field (confirming our "no artist genres" assumption)
- `GET /artist/4495513/top?limit=1` → response has `data[0].title` (string), `data[0].id` (number)
- `GET /search/artist?q=FKJ&limit=5` → response has `data` (array), each item has `id`, `name`, `picture_xl`, `nb_fan`
- `GET /artist/99999999999` → response has `error` object (confirming error shape)
- Verify no auth headers needed (request succeeds with no Authorization header)

**Run with**: `npx jest deezerApiSmoke --testTimeout=30000` (longer timeout for network calls)

---

### Unit Tests by Phase

**Phase 1: SpotifyProvider**
File: `src/server/utils/musicPlatform/__tests__/spotifyProvider.test.ts`
- Mock `externalApiQueries` functions
- `getArtist(id)` → returns `MusicPlatformArtist` with `platform: 'spotify'`, correct field mapping (followers.total → followerCount, images[0].url → imageUrl, etc.)
- `getArtist(id)` when Spotify returns error → returns `null`
- `getArtistImage(id)` → returns image URL string
- `getArtistImage(id)` when no images → returns `null`
- `getTopTrackName(id)` → returns track name string
- `searchArtists(query, limit)` → returns array of `MusicPlatformArtist` with `topTrackName: null`
- `getArtists(ids)` → calls batch endpoint, maps all results

**Phase 2: DeezerProvider**
File: `src/server/utils/musicPlatform/__tests__/deezerProvider.test.ts`
- Mock `axios.get`
- Same test cases as SpotifyProvider but with Deezer response shapes
- `getArtist(id)` → maps `nb_fan → followerCount`, `nb_album → albumCount`, `picture_xl → imageUrl`, `[] → genres`
- `getArtist(id)` when Deezer returns `{ error: {...} }` → returns `null`
- `getArtists(ids)` → calls individual fetches via `Promise.all` (no batch endpoint)

**Phase 2: ArtistMusicPlatformDataProvider**
File: `src/server/utils/musicPlatform/__tests__/artistMusicPlatformDataProvider.test.ts`
- Mock both providers (DeezerProvider + SpotifyProvider)
- Artist with both IDs → uses primary (Deezer), never calls fallback
- Artist with Deezer only → uses Deezer
- Artist with Spotify only → uses Spotify fallback
- Artist with neither → returns `null`
- Deezer call fails → falls back to Spotify
- Deezer returns `null` → falls back to Spotify
- `searchArtists` → always delegates to primary (Deezer)
- `getArtistImages` → routes each artist to correct provider, returns Map
- `getActivePlatform` → returns correct platform string

**Phase 3-5: Consumer test updates**
- Update existing tests that mock `getSpotifyHeaders`/`getSpotifyImage`/etc. to mock `musicPlatformData` instead
- `spotifyIntegration.test.ts` → keep during Phase 3 (SpotifyProvider still exists), delete in Phase 5

---

### E2E Tests (Playwright against dev server)

**File**: `e2e/musicPlatformMigration.spec.ts` (or similar)

Uses known real artists from the database. Run with Playwright MCP against `npm run dev`. Can be executed by an LLM agent or in CI.

**After Phase 1** (baseline — everything still works via Spotify):
| Test | What it asserts |
|------|----------------|
| Search returns results | Type "FKJ" in search bar → dropdown shows results with images |
| Artist profile has image | Navigate to a known artist page → `img` element has non-empty `src` |
| Artist profile shows release count | Artist page shows "N releases" text (N > 0) |
| Add artist from search | Search for a Spotify-only artist → click "Add to MusicNerd" → redirects to new artist page |
| Artist page loads without errors | No console errors, no broken image placeholders |

**After Phase 3** (consumers switched to abstraction):
| Test | What it asserts |
|------|----------------|
| All Phase 1 tests still pass | No regression |
| Artist with Deezer ID uses Deezer image | Navigate to artist known to have Deezer ID → image `src` contains `api.deezer.com` or Deezer CDN URL |
| Artist without Deezer ID still has image | Navigate to artist known to have Spotify only → image still loads (Spotify fallback) |

**After Phase 4** (search + add-artist migrated):
| Test | What it asserts |
|------|----------------|
| Search returns Deezer results | Type query → external (non-DB) results show "View on Deezer" link (not Spotify) |
| Add artist via Deezer URL | Paste `https://www.deezer.com/artist/4495513` in add-artist → succeeds |
| Add artist via Spotify URL | Paste Spotify URL → still works (both formats accepted) |

**After Phase 5** (Spotify API removed):
| Test | What it asserts |
|------|----------------|
| All Phase 3+4 tests still pass | No regression |
| No Spotify API calls | Check network tab / server logs: zero requests to `api.spotify.com` |
| Artist with Spotify-only (no Deezer ID) | Shows default avatar, page still loads without error |

---

## Key Files Reference

| File | Role |
|------|------|
| `src/server/utils/queries/externalApiQueries.ts` | Current Spotify calls — wrapped by SpotifyProvider, deleted in Phase 5 |
| `src/server/utils/musicPlatform/types.ts` | Interface + `MusicPlatformArtist` (new) |
| `src/server/utils/musicPlatform/spotifyProvider.ts` | Spotify impl (new Phase 1, deleted Phase 5) |
| `src/server/utils/musicPlatform/deezerProvider.ts` | Deezer impl (new Phase 2) |
| `src/server/utils/musicPlatform/artistMusicPlatformDataProvider.ts` | Routing + fallback (new Phase 2) |
| `src/app/api/searchArtists/route.ts` | Search pipeline — switches in Phase 3 |
| `src/app/artist/[id]/page.tsx` | Artist profile — switches in Phase 3 |
| `src/server/utils/queries/artistBioQuery.ts` | Bio generation — switches in Phase 3 |
| `src/app/artist/[id]/_components/Dashboard.tsx` | Embed removal in Phase 3 |
| `src/server/db/schema.ts` | Schema — add `deezer` column in Phase 2 |
