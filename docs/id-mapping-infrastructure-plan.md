# Cross-Platform Artist ID Mapping — Infrastructure Plan

## Context

MusicNerdWeb has ~N artists, each with a Spotify ID and name. We want to map these to other platform IDs (starting with Deezer, then Apple Music, then others) to enable an eventual migration off the Spotify API. The mapping work will be performed by automated, unsupervised agents via MCP tools.

**Design decisions:**
- Data model: Separate `artist_id_mappings` table (not columns on `artists`)
- Execution model: MCP tools the agent calls (not scripts)
- Match logic: Agent judgment with guardrails (confidence levels + reasoning logged)
- Scope: Infrastructure only (DB + MCP tools). The resolution agent is a separate project (see `docs/id-mapping-agent-prd.md`).

## Design

### Data Model: `artist_id_mappings` table

New table with provenance tracking. Platform is free text (validated at app layer) so adding new platforms doesn't require a migration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `artist_id` | uuid FK → artists.id | |
| `platform` | text | "deezer", "apple_music", etc. |
| `platform_id` | text | The ID on the target platform |
| `confidence` | enum(high, medium, low, manual) | |
| `source` | text | "wikidata", "musicbrainz", "name_search", "manual" |
| `reasoning` | text nullable | Agent's explanation for the match |
| `api_key_hash` | text nullable | Which agent key resolved it (not FK, survives key deletion) |
| `resolved_at` | timestamptz | When this resolution was made |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints: `UNIQUE(artist_id, platform)`. Indexes on `artist_id`, `platform`, `confidence`.

### MCP Tools (4 new tools)

**Read-only (no auth):**
1. **`get_unmapped_artists`** — Paginated list of artists without a mapping for a given platform. Returns `{ artists: [{ id, name, spotify }], totalUnmapped, limit, offset }`.
2. **`get_mapping_stats`** — Coverage stats: total artists, mapped/unmapped per platform, breakdown by confidence/source.
3. **`get_artist_mappings`** — All mappings for a specific artist by UUID.

**Write (requires auth):**
4. **`resolve_artist_id`** — Upsert a mapping. Only updates if new confidence >= existing. Logs reasoning. Audit logged via existing `mcp_audit_log`.

### Agent Workflow (not code — agent configuration)

The agent calls external APIs itself (Wikidata SPARQL, MusicBrainz, Deezer search) and reports results back via `resolve_artist_id`. The MCP server is purely the data layer — no external API calls from server code.

Tier 1: Wikidata SPARQL (batch 100 Spotify IDs → get Deezer/Apple Music/MBID)
Tier 2: MusicBrainz relationship lookup (1 req/sec, parse cross-platform URLs)
Tier 3: Deezer name search (agent evaluates candidates, assigns confidence + reasoning)
Tier 4: Unresolved → manual review queue

### Upsert Logic

`resolve_artist_id` reads existing mapping for (artist_id, platform):
- No existing → INSERT, return `{ created: true }`
- Existing with lower/equal confidence → UPDATE, return `{ updated: true }`
- Existing with higher confidence → skip, return `{ skipped: true }` (not an error)

### Audit

Reuse existing `logMcpAudit()`. Field format: `"mapping:deezer"`, `"mapping:apple_music"` (colon-namespaced to distinguish from link columns). Best-effort — audit failure doesn't roll back the mutation.

## Files to Change

| File | Action | What |
|------|--------|------|
| `src/server/db/schema.ts` | Modify | Add `confidenceLevel` enum, `artistIdMappings` table definition, extend `artistsRelations` with `many(artistIdMappings)`, add `artistIdMappingsRelations` |
| `src/server/db/DbTypes.ts` | Modify | Add `ArtistIdMapping` type export |
| `src/server/utils/idMappingService.ts` | **Create** | Service layer: `getUnmappedArtists()`, `resolveArtistMapping()`, `getMappingStats()`, `getArtistMappings()` + validation constants (`VALID_MAPPING_PLATFORMS`, `VALID_SOURCES`, `CONFIDENCE_PRIORITY`) |
| `src/app/api/mcp/server.ts` | Modify | Register 4 new tools at bottom, import from idMappingService |
| Migration file | **Generated** | Via `npm run db:generate` after schema changes |

## Implementation Details

### Schema (in `schema.ts`)

Add after `mcpAuditLog` definition, before relations section:

```typescript
export const confidenceLevel = pgEnum("confidence_level", ["high", "medium", "low", "manual"]);

export const artistIdMappings = pgTable("artist_id_mappings", {
  id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  artistId: uuid("artist_id").notNull(),
  platform: text().notNull(),
  platformId: text("platform_id").notNull(),
  confidence: confidenceLevel().notNull(),
  source: text().notNull(),
  reasoning: text(),
  apiKeyHash: text("api_key_hash"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: 'string' }).default(sql`now()`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`now()`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`now()`).notNull(),
}, (table) => [
  unique("artist_id_mappings_artist_platform_uniq").on(table.artistId, table.platform),
  foreignKey({ columns: [table.artistId], foreignColumns: [artists.id], name: "artist_id_mappings_artist_id_fkey" }),
  index("idx_artist_id_mappings_artist_id").using("btree", table.artistId.asc().nullsLast()),
  index("idx_artist_id_mappings_platform").using("btree", table.platform.asc().nullsLast()),
  index("idx_artist_id_mappings_confidence").using("btree", table.confidence.asc().nullsLast()),
  pgPolicy("mnweb_select_artist_id_mappings", { as: "permissive", for: "select", to: ["mnweb"], using: sql`true` }),
  pgPolicy("mnweb_insert_artist_id_mappings", { as: "permissive", for: "insert", to: ["mnweb"], withCheck: sql`true` }),
  pgPolicy("mnweb_update_artist_id_mappings", { as: "permissive", for: "update", to: ["mnweb"] }),
]);
```

### Service Layer (`idMappingService.ts`)

Pattern follows `artistLinkService.ts`:

```typescript
// Constants
export const VALID_MAPPING_PLATFORMS = new Set(["deezer", "apple_music", "musicbrainz", "wikidata", "tidal", "amazon_music", "youtube_music"]);
export const VALID_SOURCES = new Set(["wikidata", "musicbrainz", "name_search", "manual"]);
const CONFIDENCE_PRIORITY: Record<string, number> = { manual: 4, high: 3, medium: 2, low: 1 };

// Functions
export async function getUnmappedArtists(platform, limit, offset)
  // LEFT JOIN / NOT EXISTS: artists with spotify IS NOT NULL and no mapping row for platform
  // Returns { artists: [{ id, name, spotify }], totalUnmapped }

export async function resolveArtistMapping({ artistId, platform, platformId, confidence, source, reasoning, apiKeyHash })
  // Validate platform, source. Verify artist exists. Check existing. Upsert with confidence comparison.
  // Returns { created, updated, skipped, previousMapping? }

export async function getMappingStats()
  // Aggregate: total artists with spotify, per-platform counts by confidence/source

export async function getArtistMappings(artistId)
  // Simple SELECT * FROM artist_id_mappings WHERE artist_id = $1
```

### MCP Tool Registration (in `server.ts`)

4 tools appended to bottom. `resolve_artist_id` follows exact pattern of `set_artist_link`:
- `requireMcpAuth()` as first line
- Call service function
- Best-effort `logMcpAudit()` with `field: "mapping:${platform}"`, `action: "resolve"`
- McpAuthError handling

Read tools (`get_unmapped_artists`, `get_mapping_stats`, `get_artist_mappings`) follow `search_artists`/`get_artist` pattern — no auth required.

## Testing

Follow the established pattern (`jest.resetModules()` + dynamic imports in `setup()`):

| Test File | Covers |
|-----------|--------|
| `src/app/api/mcp/__tests__/resolve-artist-id.test.ts` | Auth, validation, create/update/skip, audit failure tolerance |
| `src/app/api/mcp/__tests__/get-unmapped-artists.test.ts` | Valid/invalid platform, pagination, empty results |
| `src/app/api/mcp/__tests__/get-mapping-stats.test.ts` | Stats structure |
| `src/app/api/mcp/__tests__/get-artist-mappings.test.ts` | Found/not-found artist |
| `src/server/utils/__tests__/idMappingService.test.ts` | Service layer validation, upsert logic, confidence comparison |

## Verification

1. `npm run type-check` — schema types compile
2. `npm run test` — all new + existing tests pass
3. `npm run lint && npm run build` — no regressions
4. After deploy: run migration, then test tools via MCP client:
   - `get_mapping_stats` returns zeros
   - `get_unmapped_artists` for "deezer" returns all artists
   - `resolve_artist_id` creates a mapping
   - `get_artist_mappings` returns the new mapping
   - `resolve_artist_id` with lower confidence → skipped
   - `resolve_artist_id` with equal/higher confidence → updated
