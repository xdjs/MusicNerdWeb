# API reference

Checked against the local route handlers on 2026-09-09. This is a selected endpoint reference,
not a deployment check or an exhaustive API schema. Paths are relative to the chosen app
origin: `{baseurl}/api/{endpoint}`. Use local HTTPS for development.

Handlers and their tests under [src/app/api](src/app/api) are authoritative. Authentication
and side effects vary by route; a GET or a public endpoint is not necessarily free of generation
or writes. CORS is route-specific. API rate limits are applied by [middleware](src/middleware.ts).
See [development](docs/development.md) for session/auth boundaries and [MCP](docs/mcp.md) for
agent tool access. MCP bearer keys are not a general authentication scheme for the HTTP API.

### Artist Search & Discovery

The public lookups `searchArtists`, `searchArtists/batch`, `findArtistBySpotifyID`, `findArtistByDeezerID`, `findArtistByIG`, `findTwitterHandle`, `getSpotifyData`, `trackLinks`, `leaderboard` and `artist/[id]/image` are served by MusicNerdAPI at `api.musicnerd.net`, in the response shapes external clients already use ([docs](https://docs.musicnerd.net/api-reference/lookups/search-artists)).

### Artist Data & Content

**artistBio/[id]**

 - Type: GET, PUT
 - GET Response: `{bio: "generated bio text"}`
 - PUT Body: `{bio: "new bio", regenerate?: boolean}`
 - PUT Response: `{message: "success", bio?: "generated bio"}`
 - Auth: PUT and GET with `?regenerate=true` require an admin or approved artist claimant. Ordinary GET is public and can generate a missing bio; it is not a read-only smoke check.
 - CORS: Enabled
 - Error: 404 if artist not found, 408 for timeout, 500 for server errors

**funFacts/[type]**

 - Type: GET
 - Query: `?id=artistId`
 - Params: `type` (fun fact category)
 - Response: `{text: "generated fun fact"}`; this invokes generation
 - Auth: N/A
 - Error: 400 if artist id missing, 404 if artist not found, 408 for timeout

### Platform & Link Management

**validateLink**

 - Type: POST
 - Body: `{url: "platformUrl"}`; platform is inferred from the URL
 - Response: `{valid: boolean, reason?: string}`; a failed link check can return HTTP 200 with `valid: false`
 - Auth: N/A
 - Error: 400 for missing URL or unsupported format; network/link failures are reported in `reason`

**platformRegexes**

 - Type: GET
 - Response: `Array<{siteName: string, regex: string}>`
 - Auth: N/A
 - Note: Excludes 'ens' and 'wallets' platforms

### Statistics

**pendingUGCCount**

 - Type: GET
 - Response: `{count: number}`
 - Auth: Admin required (returns 0 for non-admin)
 - Error: Returns count 0 on errors

**approvedUGCCount**

 - Type: GET
 - Response: `{count: number}` for the current user’s approved contributions
 - Auth: Session-based; returns count 0 without a session
 - Error: Returns count 0 on errors

**ugcCount**

 - Type: GET
 - Response: `{count: number}` for the current user’s contributions
 - Auth: Session-based; returns count 0 without a session
 - Error: Returns count 0 on errors

**recentEdited**

 - Type: GET
 - Query: `?userId=userId`
 - Response: `Array<RecentEdit>`
 - Auth: Session-based or userId parameter
 - Error: Returns empty array on errors

### Additional route families

| Area | Entry points |
| --- | --- |
| Account bookmarks (local feature; check migration/release status) | [Local feature contract](docs/account-bookmarks.md); `/api/bookmarks` is not in this docs release |
| Account login and wallet linking | [Auth reference](docs/development.md#architecture-and-integration-map), [link handler](src/app/api/auth/link-wallet/route.ts) |
| Artist questions and interview | [Ask](src/app/api/askArtist/route.ts), [interview chat](src/app/api/onboarding/[artistId]/chat/route.ts) |
| Source research and stored knowledge | [Lore URL suggestions](src/app/api/artist/[id]/lore-suggestions/route.ts), [research refresh](src/app/api/artist/[id]/research/refresh/route.ts), [scheduler](src/app/api/research/advance/route.ts), [knowledge export](src/app/api/artist/[id]/knowledge-doc/export/route.ts) |
| Uploads | [Vault upload](src/app/api/vault/upload/route.ts), [profile image](src/app/api/artist/profile-image/route.ts) |
| Admin and worker operations | [Admin routes](src/app/api/admin), [agent routes](src/app/api/agent) |
| MCP | [Reference](docs/mcp.md) |
| Health | [Health handler](src/app/api/health/route.ts) |

The former `/api/coverage` endpoint is absent. Use `npm run test:coverage` for local coverage
and `npm run test:ci` for CI verification.

### Example

This searches stored artists on MusicNerdAPI and does not create an artist:

```javascript
const response = await fetch('https://api.musicnerd.net/api/searchArtists/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: { artists: ['Pete Rango'] } }),
});
if (!response.ok) throw new Error(`Search failed: ${response.status}`);
const { results } = await response.json();
```
