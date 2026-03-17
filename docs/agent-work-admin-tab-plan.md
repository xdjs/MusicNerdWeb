# Agent Work Admin Tab

## Context
ID mapping agents have been running and producing data (mappings, exclusions, audit entries), but there's no way to see their work in the admin UI. Adding an "Agent Work" tab to the admin dashboard with four sections: platform coverage stats, recent audit log, per-agent breakdown, and exclusions report.

## New Files

### 1. API Route: `src/app/api/admin/agent-work/route.ts`
Single GET endpoint returning all four data sections in one response. Uses `requireAdmin()` guard.

Returns:
```ts
{
  stats: { totalArtistsWithSpotify: number, platformStats: [...] },
  auditLog: { entries: [...], total: number },
  agentBreakdown: { agents: [...] },
  exclusions: { platforms: { [platform]: { exclusions: [...], total: number } } }
}
```

**Queries** (all raw SQL via `db.execute` for aggregation):

- **stats**: Reuse `getMappingStats()` from `idMappingService.ts`
- **auditLog**: Query `mcp_audit_log` joined with `artists.name` and `mcp_api_keys.label`, ordered by `created_at DESC`, limit 100. Fields: `id, artistId, artistName, field, action, oldValue, newValue, agentLabel, createdAt`
- **agentBreakdown**: Aggregate `artist_id_mappings` grouped by `api_key_hash`, joined with `mcp_api_keys.label` for agent name. Count total resolved, plus breakdown by confidence and source. Also count from `artist_mapping_exclusions` grouped by `api_key_hash`. Returns: `{ label, resolvedCount, excludedCount, byConfidence: {high, medium, low}, bySource: {wikidata, musicbrainz, name_search, web_search} }`
- **exclusions**: Reuse `getMappingExclusions()` from `idMappingService.ts` for each platform that has exclusions

### 2. UI Component: `src/app/admin/AgentWorkSection.tsx`
Client component with four collapsible/visible sub-sections:

#### a. Platform Coverage Stats
Simple cards/grid showing each platform with mapped count, total, and percentage bar. Reuse data from `getMappingStats()`.

#### b. Per-Agent Breakdown
Table with columns: Agent Name, Resolved, Excluded, High/Medium/Low confidence, Sources breakdown. One row per agent (API key label).

#### c. Recent Audit Log
Table with columns: Time, Agent, Action, Field, Artist, Old → New. Shows last 100 entries. Action column uses color-coded badges (resolve=green, exclude=yellow, set=blue, delete=red).

#### d. Exclusions Report
Grouped by platform. Each platform shows a table: Artist Name, Reason, Details, Date. Collapsible per platform since most work is on deezer currently.

## Modified Files

### 3. `src/app/admin/AdminTabs.tsx`
- Add `agentWorkContent: ReactNode` prop
- Add new tab trigger: `<TabsTrigger value="agent-work">Agent Work</TabsTrigger>`
- Add new tab content panel

### 4. `src/app/admin/page.tsx`
- Import `AgentWorkSection`
- Fetch agent work data in the `Promise.all` (new query function)
- Pass as `agentWorkContent` prop to `AdminTabs`

### 5. `src/server/utils/queries/agentWorkQueries.ts` (new)
Server-side query functions:
- `getAgentWorkData()` — orchestrates all four queries, returns combined result
- `getAuditLog(limit)` — audit log with joins
- `getAgentBreakdown()` — per-agent aggregation

Reuses `getMappingStats()` and `getMappingExclusions()` from `idMappingService.ts`.

## Implementation Order

1. `agentWorkQueries.ts` — data layer
2. `api/admin/agent-work/route.ts` — API endpoint
3. `AgentWorkSection.tsx` — UI component
4. `AdminTabs.tsx` + `page.tsx` — wire it up

## Verification

- Visit `/admin`, click "Agent Work" tab
- Platform stats should show mapped counts matching `get_mapping_stats` MCP tool output
- Audit log should show recent resolve/exclude actions with agent names
- Per-agent breakdown should show the `id-mapping-agent-wb0` key's work
- Exclusions should show name_mismatch/too_ambiguous/conflict entries grouped by platform
- Run `npm run type-check && npm run lint`
