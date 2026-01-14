# MCP Server Implementation Plan

This document details the implementation tasks for the MusicNerd MCP server as specified in [mcp-server-prd.md](./mcp-server-prd.md).

## Architecture Overview

```
src/app/api/mcp/
├── route.ts              # Streamable HTTP endpoint
├── server.ts             # MCP server instance & tool registration
├── tools/
│   ├── search-artists.ts # search_artists tool handler
│   └── get-artist.ts     # get_artist tool handler
├── transformers/
│   ├── artist-summary.ts # Artist → ArtistSummary
│   └── artist-detail.ts  # Artist → ArtistDetail (with social links)
├── types.ts              # MCP response types
└── __tests__/
    ├── search-artists.test.ts
    ├── get-artist.test.ts
    ├── transformers.test.ts
    └── integration.test.ts
```

## Workstreams

The implementation is divided into 4 parallel workstreams. Workstreams A, B, and D can start simultaneously. Workstream C depends on A and B.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  A: Types &     │     │  B: MCP Server  │     │  D: Tests       │
│  Transformers   │     │  Setup          │     │  (unit tests    │
│                 │     │                 │     │   for A, B)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────┬───────────┘                       │
                     │                                   │
                     ▼                                   │
         ┌─────────────────────┐                         │
         │  C: Tool Handlers   │                         │
         │  (depends on A & B) │                         │
         └──────────┬──────────┘                         │
                    │                                    │
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────┐
                    │  Integration Tests &    │
                    │  Manual Testing         │
                    └─────────────────────────┘
```

---

## Workstream A: Types & Transformers

**Goal:** Define response types and create functions to transform database entities to MCP response formats.

**Dependencies:** None (can start immediately)

### A1. Define MCP Response Types

**File:** `src/app/api/mcp/types.ts`

```typescript
// Types to implement:
export interface ArtistSummary {
  id: string;
  name: string;
}

export interface SocialLink {
  handle: string;
  url: string;
}

export interface ArtistDetail {
  id: string;
  name: string;
  bio: string | null;
  spotifyId: string | null;
  socialLinks: Record<string, SocialLink>;
}

export interface SearchResponse {
  artists: ArtistSummary[];
  totalResults: number;
}

export interface GetArtistResponse {
  artist: ArtistDetail;
}

export interface ErrorResponse {
  error: string;
  code: "NOT_FOUND" | "INVALID_INPUT" | "INTERNAL_ERROR";
}
```

### A2. Create ArtistSummary Transformer

**File:** `src/app/api/mcp/transformers/artist-summary.ts`

```typescript
// Transform database Artist to ArtistSummary
export function toArtistSummary(artist: Artist): ArtistSummary
```

**Implementation notes:**
- Extract only `id` and `name` from Artist
- Handle null name gracefully (use empty string or throw?)

### A3. Create ArtistDetail Transformer

**File:** `src/app/api/mcp/transformers/artist-detail.ts`

```typescript
// Transform database Artist + ArtistLinks to ArtistDetail
export async function toArtistDetail(artist: Artist): Promise<ArtistDetail>
```

**Implementation notes:**
- Call `getArtistLinks(artist)` to get full URLs
- Transform ArtistLink[] to Record<string, SocialLink> format
- Map platform names from urlmap to socialLinks keys
- Return empty object `{}` for socialLinks if no links
- Include `bio` (may be null) and `spotifyId` (from `spotify` column)

---

## Workstream B: MCP Server Setup

**Goal:** Set up the MCP server with Streamable HTTP transport.

**Dependencies:** None (can start immediately)

### B1. Install MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### B2. Create MCP Server Instance

**File:** `src/app/api/mcp/server.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Create and configure server instance
// Register tools: search_artists, get_artist
// Export server instance
```

**Implementation notes:**
- Server name: "musicnerd"
- Server version: from package.json or hardcoded "1.0.0"
- Register tool schemas with JSON Schema for input validation

### B3. Create Streamable HTTP Route Handler

**File:** `src/app/api/mcp/route.ts`

```typescript
import { createMcpHandler } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export async function POST(req: Request) {
  // Handle MCP requests via Streamable HTTP
}

export async function GET(req: Request) {
  // Optional: Return server info or health check
}

export async function DELETE(req: Request) {
  // Handle session termination if needed
}
```

**Implementation notes:**
- Follow MCP Streamable HTTP spec
- Handle session management (stateless for v1 is fine)
- Return appropriate headers for MCP protocol

---

## Workstream C: Tool Handlers

**Goal:** Implement the search_artists and get_artist tool handlers.

**Dependencies:** Workstream A (types), Workstream B (server setup)

### C1. Implement search_artists Tool

**File:** `src/app/api/mcp/tools/search-artists.ts`

```typescript
export async function handleSearchArtists(args: {
  query: string;
  limit?: number;
}): Promise<SearchResponse>
```

**Implementation notes:**
- Input validation:
  - Empty query string → return `{ artists: [], totalResults: 0 }`
  - Limit out of range → clamp to default (10)
  - Sanitize query string (trim, prevent injection)
- Call `searchForArtistByName(query)` from `artistQueries.ts`
- Apply limit to results
- Transform results using `toArtistSummary()`
- Return `SearchResponse`

**Tool schema:**
```json
{
  "name": "search_artists",
  "description": "Search for artists in the MusicNerd database by name",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Artist name to search for"
      },
      "limit": {
        "type": "number",
        "description": "Maximum results to return (default: 10, max: 50)"
      }
    },
    "required": ["query"]
  }
}
```

### C2. Implement get_artist Tool

**File:** `src/app/api/mcp/tools/get-artist.ts`

```typescript
export async function handleGetArtist(args: {
  id: string;
}): Promise<GetArtistResponse | ErrorResponse>
```

**Implementation notes:**
- Input validation:
  - Validate UUID format
  - Sanitize input
- Call `getArtistById(id)` from `artistQueries.ts`
- Handle not found → return `ErrorResponse` with code `NOT_FOUND`
- Transform result using `toArtistDetail()`
- Return `GetArtistResponse`

**Tool schema:**
```json
{
  "name": "get_artist",
  "description": "Get detailed information about an artist by their MusicNerd ID",
  "inputSchema": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "MusicNerd artist ID (UUID)"
      }
    },
    "required": ["id"]
  }
}
```

### C3. Wire Tools to Server

**File:** `src/app/api/mcp/server.ts` (update)

- Register both tools with their handlers
- Map tool calls to handler functions
- Handle errors gracefully (catch and return INTERNAL_ERROR)

---

## Workstream D: Testing

**Goal:** Comprehensive test coverage for all components.

**Dependencies:** Can start unit tests for A in parallel. Integration tests depend on C.

### D1. Unit Tests for Transformers

**File:** `src/app/api/mcp/__tests__/transformers.test.ts`

Test cases:
- `toArtistSummary`: transforms Artist correctly
- `toArtistSummary`: handles null name
- `toArtistDetail`: transforms Artist with social links
- `toArtistDetail`: handles artist with no social links (empty object)
- `toArtistDetail`: handles null bio
- `toArtistDetail`: maps platform names correctly

### D2. Unit Tests for search_artists

**File:** `src/app/api/mcp/__tests__/search-artists.test.ts`

Test cases:
- Returns results for valid query
- Returns empty array for no matches
- Returns empty array for empty query string
- Clamps limit to default when out of range
- Respects limit parameter
- Results are ordered by relevance

**Mocking:** Mock `searchForArtistByName` from artistQueries

### D3. Unit Tests for get_artist

**File:** `src/app/api/mcp/__tests__/get-artist.test.ts`

Test cases:
- Returns artist detail for valid ID
- Returns NOT_FOUND error for non-existent ID
- Returns INVALID_INPUT for malformed UUID
- Includes social links in correct format
- Handles artist with no social links

**Mocking:** Mock `getArtistById` and `getArtistLinks` from artistQueries

### D4. Integration Tests

**File:** `src/app/api/mcp/__tests__/integration.test.ts`

Test cases:
- Full request/response cycle for search_artists
- Full request/response cycle for get_artist
- MCP protocol compliance (correct message format)
- Error handling (malformed requests)

**Setup:** Use test database or seed data

### D5. Manual Testing with Claude Desktop

- Configure Claude Desktop with local MCP server
- Test search_artists with various queries
- Test get_artist with valid and invalid IDs
- Verify response format matches PRD

---

## Task Checklist

### Workstream A: Types & Transformers
- [ ] A1. Define MCP response types in `types.ts`
- [ ] A2. Implement `toArtistSummary` transformer
- [ ] A3. Implement `toArtistDetail` transformer

### Workstream B: MCP Server Setup
- [ ] B1. Install `@modelcontextprotocol/sdk`
- [ ] B2. Create MCP server instance with tool registration
- [ ] B3. Create Streamable HTTP route handler

### Workstream C: Tool Handlers
- [ ] C1. Implement `search_artists` tool handler
- [ ] C2. Implement `get_artist` tool handler
- [ ] C3. Wire tools to server and test end-to-end

### Workstream D: Testing
- [ ] D1. Unit tests for transformers
- [ ] D2. Unit tests for search_artists
- [ ] D3. Unit tests for get_artist
- [ ] D4. Integration tests
- [ ] D5. Manual testing with Claude Desktop

---

## Implementation Decisions

1. **Error handling:** Follow MCP SDK conventions for error handling in tool handlers.

2. **Session management:** Stateless for v1 - no session tracking required.

3. **Logging:** Console logging for MCP requests (debugging/monitoring).

---

## Definition of Done

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing with Claude Desktop successful
- [ ] Code review completed
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
