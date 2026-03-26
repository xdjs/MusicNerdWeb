# Agent Work Admin Tab

## Context
ID mapping agents have been running and producing data (mappings, exclusions, audit entries), but there's no way to see their work in the admin UI. Adding an "Agent Work" tab to the admin dashboard with four sections: platform coverage stats, recent audit log, per-agent breakdown, and exclusions report.

## Key Decisions
- **Audit log**: Paginated (not just last 100) — the log grows fast with every resolve/exclude
- **Exclusions**: Only fetch platforms that have data — query counts first, skip empty platforms
- **Data loading**: Lazy-load via client-side fetch when tab is clicked — no impact on initial admin page load

## New Files

### 1. API Route: `src/app/api/admin/agent-work/route.ts`
Single GET endpoint returning all four data sections. Uses `requireAdmin()` guard.

Supports query params for audit log pagination:
- `?auditPage=1&auditLimit=50` (default page=1, limit=50)

Returns:
```ts
{
  stats: {
    totalArtistsWithSpotify: number,
    platformStats: { platform: string, mappedCount: number, percentage: number }[]
  },
  auditLog: {
    entries: {
      id: string, artistId: string, artistName: string,
      field: string, action: string,
      oldValue: string | null, newValue: string | null,
      agentLabel: string, createdAt: string
    }[],
    total: number,
    page: number,
    limit: number
  },
  agentBreakdown: {
    agents: {
      label: string,
      resolvedCount: number,
      excludedCount: number,
      byConfidence: { high: number, medium: number, low: number },
      bySource: { wikidata: number, musicbrainz: number, name_search: number, web_search: number, manual: number }
    }[]
  },
  exclusions: {
    // Only platforms that have exclusions — empty platforms omitted
    platforms: {
      [platform: string]: {
        exclusions: { id: string, artistId: string, artistName: string, spotify: string, reason: string, details: string | null, createdAt: string }[],
        total: number
      }
    }
  }
}
```

**Queries:**

- **stats**: Reuse `getMappingStats()` from `idMappingService.ts`
- **auditLog**: Query `mcp_audit_log` joined with `artists.name` and `mcp_api_keys.label`, ordered by `created_at DESC`, with LIMIT/OFFSET for pagination. Separate COUNT query for total.
- **agentBreakdown**: Two aggregation queries:
  1. `artist_id_mappings` grouped by `api_key_hash`, joined with `mcp_api_keys.label`. COUNT total, plus conditional counts for confidence and source.
  2. `artist_mapping_exclusions` grouped by `api_key_hash`, joined with `mcp_api_keys.label`. COUNT total.
  Merge results by api_key_hash in JS.
- **exclusions**: First query platform counts from `artist_mapping_exclusions` GROUP BY platform. Then call `getMappingExclusions(platform)` only for platforms with count > 0.

### 2. UI Component: `src/app/admin/AgentWorkSection.tsx`
Client component that fetches from `/api/admin/agent-work` on mount. Shows loading state, then renders four sub-sections:

#### a. Platform Coverage Stats
Cards/grid showing each platform: name, mapped count / total, percentage with a progress bar.

#### b. Per-Agent Breakdown
Table: Agent Name | Resolved | Excluded | High | Medium | Low | Wikidata | MusicBrainz | Name Search | Web Search | Manual

#### c. Recent Audit Log (Paginated)
Table: Time | Agent | Action | Field | Artist | Old → New
- Action column uses color-coded badges (resolve=green, exclude=yellow, set=blue, delete=red)
- Prev/Next pagination controls at bottom
- Artist name links to `/artist/[id]`

#### d. Exclusions Report
Grouped by platform (only platforms with data shown). Each platform is a collapsible section with table: Artist Name | Reason | Details | Date. Artist name links to `/artist/[id]`.

### 3. `src/server/utils/queries/agentWorkQueries.ts` (new)
Server-side query functions:
- `getAgentWorkData(auditPage, auditLimit)` — orchestrates all queries, returns combined result
- `getAuditLog(page, limit)` — paginated audit log with artist name + agent label joins
- `getAgentBreakdown()` — per-agent aggregation from mappings + exclusions tables
- `getExclusionsByPlatform()` — counts per platform, then fetches details for non-empty platforms

Reuses `getMappingStats()` from `idMappingService.ts`.

## Modified Files

### 4. `src/app/admin/AdminTabs.tsx`
- Add `agentWorkContent: ReactNode` prop
- Add new tab trigger: `<TabsTrigger value="agent-work">Agent Work</TabsTrigger>`
- Add new tab content panel

### 5. `src/app/admin/page.tsx`
- Import `AgentWorkSection`
- Pass `<AgentWorkSection />` as `agentWorkContent` prop (no server-side data fetch needed — component fetches on mount)

## Tests

### 6. API Route Tests: `src/app/api/admin/agent-work/__tests__/route.test.ts`
Follow the project pattern: `@ts-nocheck`, `jest.resetModules()` in `beforeEach`, dynamic imports in `setup()`.

- **Returns 401 when not authenticated**
- **Returns 403 when not admin**
- **Returns all four data sections on success** — verify shape: `stats`, `auditLog`, `agentBreakdown`, `exclusions`
- **Passes pagination params to audit log query** — `?auditPage=2&auditLimit=25`
- **Defaults pagination** — no params → page=1, limit=50
- **Returns 500 on query error**

### 7. UI Component Tests: `src/app/admin/__tests__/AgentWorkSection.test.tsx`
Uses React Testing Library. Mock `fetch` to return fixture data.

- **Shows loading state initially** — spinner/skeleton visible before fetch resolves
- **Renders platform stats** — mapped counts and percentages appear after fetch
- **Renders per-agent breakdown table** — agent names, resolved/excluded counts
- **Renders audit log with entries** — timestamps, actions, artist names, action badges
- **Audit log pagination** — clicking "Next" fetches page 2, "Previous" disabled on page 1
- **Renders exclusions grouped by platform** — only platforms with data shown
- **Artist names are links** — exclusions and audit log artist names link to `/artist/[id]`
- **Shows error state on fetch failure** — error message displayed
- **Action badges have correct styling** — resolve=green, exclude=yellow, set=blue, delete=red

### 8. Query Tests: `src/server/utils/queries/__tests__/agentWorkQueries.test.ts`
Mock `db.execute` for raw SQL queries, mock imported functions from `idMappingService.ts`.

- **getAuditLog returns paginated results** — correct LIMIT/OFFSET from page/limit params
- **getAuditLog returns total count** — separate COUNT query result
- **getAgentBreakdown merges mappings and exclusions** — combines two query results by api_key_hash
- **getAgentBreakdown handles agent with mappings but no exclusions** — excludedCount defaults to 0
- **getExclusionsByPlatform skips empty platforms** — only calls getMappingExclusions for platforms with count > 0
- **getExclusionsByPlatform returns empty object when no exclusions exist**
- **getAgentWorkData orchestrates all queries** — calls all sub-functions, returns combined shape

### 9. E2E Tests (Playwright): `e2e/admin-agent-work.spec.ts`
Uses Playwright against running dev server. Requires admin login via Privy test account.

- **Tab is visible and clickable** — navigate to `/admin`, "Agent Work" tab exists
- **Data loads on tab click** — click tab, wait for loading to finish, content appears
- **Platform stats render** — at least one platform card with a mapped count visible
- **Agent breakdown table has rows** — at least one agent row with resolved count > 0
- **Audit log renders entries** — table has rows with action badges
- **Audit log pagination works** — click "Next", content changes, "Previous" becomes enabled
- **Exclusions section renders** — at least one platform group with exclusion rows
- **Artist links navigate correctly** — click an artist name in audit log, navigates to `/artist/[id]`

## Implementation Order

1. `agentWorkQueries.ts` — data layer
2. `agentWorkQueries.test.ts` — query tests
3. `api/admin/agent-work/route.ts` — API endpoint
4. `route.test.ts` — API route tests
5. `AgentWorkSection.tsx` — UI component
6. `AgentWorkSection.test.tsx` — UI component tests
7. `AdminTabs.tsx` + `page.tsx` — wire it up

## Verification

- Visit `/admin`, click "Agent Work" tab → loading spinner, then data appears
- Platform stats match `get_mapping_stats` MCP tool output
- Audit log shows paginated resolve/exclude actions with agent names
- Clicking Next/Prev on audit log loads more entries
- Per-agent breakdown shows `id-mapping-agent-wb0` key's work
- Exclusions only show platforms with data (currently just deezer)
- Artist names link to correct artist pages
- Run `npm run type-check && npm run lint`
