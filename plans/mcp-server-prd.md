# MCP Server for MusicNerd - Product Requirements Document

## Overview

Add a Model Context Protocol (MCP) server to MusicNerd that exposes artist data to AI assistants and applications. The MCP server enables AI systems to query MusicNerd's artist database, allowing them to answer questions like "based on what musicnerd.xyz knows about <artist>, tell me about what they have been up to lately."

## Problem Statement

AI assistants (Claude, ChatGPT, custom apps) currently have no programmatic way to access MusicNerd's rich artist data. Users who want AI-powered insights about artists must manually copy/paste information from the website.

## Goals

1. **Enable AI Access**: Allow AI assistants to query MusicNerd's artist database via MCP
2. **Simple Integration**: Make it easy for developers to connect their AI apps to MusicNerd
3. **Minimal Overhead**: Integrate into existing Next.js app without new infrastructure
4. **Future Extensibility**: Design for easy addition of new capabilities (artist submission, UGC)

## Primary Use Cases

1. **Artist Research**: AI assistants can look up artist information including social links and bio
2. **Activity Discovery**: Consumers can use returned social links to fetch recent artist activity
3. **Prototype Development**: Developers building AI-powered music apps can integrate MusicNerd data

## Target Consumers

- Claude Desktop / Claude CLI
- ChatGPT with MCP support
- Custom AI applications and prototypes
- Developer tools and integrations

## Technical Approach

### Transport Protocol
- **Streamable HTTP** transport (recommended MCP transport)
- Publicly accessible endpoint at `/api/mcp`
- No authentication required initially (easy to add later via middleware)
- No rate limiting initially (easy to add later via Upstash Redis or similar)

### Integration
- Integrated into existing Next.js application as API routes
- Shares database connection and existing query infrastructure
- No new deployment or infrastructure required

## MCP Tools

### Phase 1: Core Artist Access (Initial Release)

#### `search_artists`

Search for artists in the MusicNerd database. This is a thin wrapper over the existing search functionality.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Artist name to search for |
| `limit` | number | No | Maximum results to return (default: 10, max: 50) |

**Output:**
Returns an array of artist summaries ordered by relevance. The consumer decides how to handle the results (e.g., pick the top result, ask the user to clarify, fetch full details via `get_artist`).

**Input Validation:**
| Scenario | Behavior |
|----------|----------|
| Empty query string | Return empty results `{ "artists": [], "totalResults": 0 }` |
| Limit out of range (< 1 or > 50) | Clamp to default limit (10) |
| Invalid input (e.g., malformed request) | Return `INVALID_INPUT` error |

**Example Request:**
```json
{
  "name": "search_artists",
  "arguments": {
    "query": "Daft Punk",
    "limit": 5
  }
}
```

**Example Response:**
```json
{
  "artists": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Daft Punk"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Daft Punk Tribute"
    }
  ],
  "totalResults": 2
}
```

**Example Response (No Results):**
```json
{
  "artists": [],
  "totalResults": 0
}
```

---

#### `get_artist`

Fetch detailed information for a specific artist by ID. This is a thin wrapper over the existing get-artist-by-id functionality.

**Input Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | MusicNerd artist ID |

**Output:**
Returns the full artist object containing:
- `id` - MusicNerd artist ID
- `name` - Artist name
- `bio` - AI-generated artist biography (may be null)
- `spotifyId` - Spotify artist ID (if linked)
- `socialLinks` - All available platform links

**Example Request:**
```json
{
  "name": "get_artist",
  "arguments": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

**Example Response:**
```json
{
  "artist": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Daft Punk",
    "bio": "Daft Punk was a French electronic music duo...",
    "spotifyId": "4tZwfgrHOc3mvqYlEYSvVi",
    "socialLinks": {
      "spotify": { "handle": "4tZwfgrHOc3mvqYlEYSvVi", "url": "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi" },
      "instagram": { "handle": "daftpunk", "url": "https://instagram.com/daftpunk" },
      "twitter": { "handle": "daborobot", "url": "https://twitter.com/daborobot" },
      "youtube": { "handle": "@DaftPunk", "url": "https://youtube.com/@DaftPunk" },
      "soundcloud": { "handle": "daftpunk", "url": "https://soundcloud.com/daftpunk" }
    }
  }
}
```

**Error Response (Artist Not Found):**
```json
{
  "error": "Artist not found",
  "code": "NOT_FOUND"
}
```

---

### Phase 2: Future Capabilities (Out of Scope for v1)

These tools are planned for future releases:

#### `add_artist` (Phase 2)
Submit a new artist to MusicNerd (requires authentication).

#### `submit_ugc` (Phase 2)
Submit user-generated content updates for an artist (requires authentication).

## Data Model

### Artist Response Schema

```typescript
// Summary returned by search_artists
interface ArtistSummary {
  id: string; // UUID
  name: string;
}

// Social link with both handle and full URL
interface SocialLink {
  handle: string;
  url: string;
}

// Full artist details returned by get_artist
interface ArtistDetail {
  id: string; // UUID
  name: string;
  bio: string | null;
  spotifyId: string | null;
  socialLinks: {
    // All available platform links (empty object {} if none)
    spotify?: SocialLink;
    applemusic?: SocialLink;
    instagram?: SocialLink;
    twitter?: SocialLink;
    youtube?: SocialLink;
    youtubechannel?: SocialLink;
    tiktok?: SocialLink;
    soundcloud?: SocialLink;
    bandcamp?: SocialLink;
    facebook?: SocialLink;
    discord?: SocialLink;
    // ... other platforms as available
  };
}

// search_artists response
interface SearchResponse {
  artists: ArtistSummary[];
  totalResults: number;
}

// get_artist response
interface GetArtistResponse {
  artist: ArtistDetail;
}

// Error response
interface ErrorResponse {
  error: string;
  code: "NOT_FOUND" | "INVALID_INPUT" | "INTERNAL_ERROR";
}
```

## Client Configuration

### Claude Desktop / CLI
```json
{
  "mcpServers": {
    "musicnerd": {
      "type": "streamable-http",
      "url": "https://musicnerd.xyz/api/mcp"
    }
  }
}
```

### Local Development
```json
{
  "mcpServers": {
    "musicnerd-local": {
      "type": "streamable-http",
      "url": "https://localhost:3000/api/mcp"
    }
  }
}
```

## Non-Goals (v1)

- **Spotify API Integration**: Only local database results, no live Spotify queries
- **Authentication**: Public access only (no API keys or auth)
- **Rate Limiting**: No usage limits initially
- **Write Operations**: No artist submission or UGC in v1
- **Pagination**: No offset/cursor support; consumers get up to `limit` results
- **Real-time Activity**: MCP returns social links; fetching recent activity is consumer's responsibility

## Security Considerations

### Current (v1)
- Read-only access to public artist data
- No sensitive data exposed
- No authentication required
- Input sanitization on all user-provided parameters to prevent injection attacks

### Future (v2+)
- Add API key authentication via middleware when needed
- Rate limiting via Upstash Redis
- Scoped permissions for write operations

## Success Criteria

1. **Functional**: AI assistants can successfully search for artists and fetch artist details
2. **Performant**: Both tools return within 500ms for typical queries
3. **Reliable**: 99%+ uptime matching main application
4. **Discoverable**: Clear documentation for developers to integrate

## Dependencies

- `@modelcontextprotocol/sdk` - Official MCP SDK for TypeScript
- Existing: Drizzle ORM, PostgreSQL, Next.js API routes

## Timeline

No specific timeline - implementation when ready.

## Open Questions

1. Should we expose the `addedBy` user information in search results?
2. Should we include fun facts in the response alongside bio?

## Appendix

### Platform Link Fields Available

Based on the artist schema, these social link fields can be exposed:
- spotify, applemusic, deezer, tidal, amazonmusic, pandora, soundcloud, audiomack
- youtube, youtubechannel, vevo
- instagram, twitter, tiktok, facebook, threads, bluesky
- bandcamp, beatport, traxsource
- songkick, bandsintown
- genius, discogs, allmusic, musicbrainz
- discord, twitch, patreon, linktree
- website
- And more (~40 platforms total)
