# Homepage Live Activity Feed

## Context

The MusicNerdWeb homepage is currently a static hero page with rotating subtitle text. With agents actively mapping thousands of artists and human contributors adding links, there's a compelling story to tell on the homepage — a live feed showing the site is alive and actively growing. This replaces the rotating subtitles with a real-time stream of activity that links visitors directly to artist pages.

## Requirements (from brainstorm)

- **Feed content**: Agent mappings, human UGC submissions, new artists added (no exclusions)
- **Visibility**: Public, no auth required
- **Layout**: Remove rotating subtitles. Keep logo, profile avatar, search, footer. Feed goes below search.
- **Clickable**: Each item links to the artist page
- **Updates**: SSE/streaming for real-time push
- **Size**: 10-15 most recent items visible

## Data sources

| Source | Table | Join | Example text |
|---|---|---|---|
| Agent mapping | `mcp_audit_log` WHERE action='resolve' | LEFT JOIN artists ON artist_id | "Deezer ID mapped for **Mogwai**" |
| Human UGC | `ugcresearch` WHERE accepted=true | Has `name` field directly | "YouTube link added for **SENTO**" |
| New artist | `artists` | Has `name` field, JOIN users for addedBy | "**Taylor Swift** added to the directory" |

All three have `created_at` with DESC indexes — efficient for recent-activity queries.

## Architecture

### API: `GET /api/activity/stream`

SSE endpoint that streams activity events. Public, no auth.

**Initial load**: Query the 3 sources for recent events (last 24h), merge and sort by `created_at DESC`, return the 15 most recent as an initial batch.

**Streaming**: Keep the connection alive. Poll the DB every 10 seconds for new events since the last seen timestamp. Push any new events via SSE. Vercel Fluid Compute supports long-running streaming functions (up to 300s on Pro). Client auto-reconnects with `EventSource` using `Last-Event-ID` header.

**Event format**:
```
id: <timestamp_ms>
event: activity
data: {"type":"agent_mapping","artistId":"...","artistName":"Mogwai","platform":"deezer","createdAt":"..."}

id: <timestamp_ms>
event: activity
data: {"type":"ugc_approved","artistId":"...","artistName":"SENTO","platform":"youtube","createdAt":"..."}

id: <timestamp_ms>
event: activity
data: {"type":"artist_added","artistId":"...","artistName":"Taylor Swift","addedBy":"clt","createdAt":"..."}
```

**Fallback**: Also support `GET /api/activity` (no stream) that returns JSON array of the 15 most recent events. Used as initial fetch and for browsers without SSE.

### Query: `src/server/utils/queries/activityQueries.ts`

New query file with:

```typescript
export async function getRecentActivity(since?: string, limit = 15): Promise<ActivityEvent[]>
```

Uses a UNION ALL query across the 3 sources, sorted by `created_at DESC`:

```sql
(SELECT 'agent_mapping' AS type, al.artist_id, a.name AS artist_name,
        al.field AS platform, al.created_at
 FROM mcp_audit_log al
 LEFT JOIN artists a ON a.id = al.artist_id
 WHERE al.action = 'resolve' AND al.field LIKE 'mapping:%'
   AND al.created_at > $since
 ORDER BY al.created_at DESC LIMIT $limit)

UNION ALL

(SELECT 'ugc_approved' AS type, u.artist_id, u.name AS artist_name,
        u.site_name AS platform, u.date_processed AS created_at
 FROM ugcresearch u
 WHERE u.accepted = true AND u.date_processed IS NOT NULL
   AND u.date_processed > $since
 ORDER BY u.date_processed DESC LIMIT $limit)

UNION ALL

(SELECT 'artist_added' AS type, ar.id AS artist_id, ar.name AS artist_name,
        NULL AS platform, ar.created_at
 FROM artists ar
 WHERE ar.created_at > $since
 ORDER BY ar.created_at DESC LIMIT $limit)

ORDER BY created_at DESC
LIMIT $limit
```

Single query, no N+1. Uses existing indexes.

### UI: Updated `HomePageSplash.tsx`

**Layout** (top to bottom):
```
┌─────────────────────────────────────────────────┐
│ [logo]                              [profile]    │
│                                                   │
│              Ask Music Nerd about an artist        │
│              [ Search for an artist... ]           │
│                                                   │
│              ── Live Activity ──                   │
│                                                   │
│  🤖 Deezer ID mapped for Mogwai           2m ago  │
│  🤖 Apple Music mapped for Mogwai         2m ago  │
│  👤 YouTube link added for SENTO          5m ago  │
│  🤖 Deezer ID mapped for Jodeci         12m ago  │
│  ✨ Taylor Swift added to directory      1h ago  │
│  🤖 Deezer ID mapped for Lethal Bizzle  1h ago  │
│  ...                                              │
│                                                   │
│  Made in Seattle by @cxy @clt and friends         │
└─────────────────────────────────────────────────┘
```

**New component**: `ActivityFeed.tsx` (client component)
- Uses `EventSource` to connect to `/api/activity/stream`
- Falls back to polling `/api/activity` if SSE fails
- New items animate in from the top (slide-down)
- Each item is a link to `/artist/<id>`
- Shows relative time ("2m ago", "1h ago")
- Icon prefix: 🤖 for agent, 👤 for human UGC, ✨ for new artist
- Compact single-line items, muted styling, artist name is the bold/highlighted part
- Dedupes: if the same artist has multiple agent mappings within 1 minute, collapse to one entry ("3 platforms mapped for **Mogwai**")

### Connection pool safety

The SSE endpoint polls every 10s with a single lightweight query (UNION ALL with LIMIT 15). Each poll opens 1 connection. Even with 100 concurrent homepage visitors, this is just 1 query per visitor every 10s = ~10 queries/sec at peak. Well within the 50-connection pool.

## Files

### New files
- `src/app/api/activity/stream/route.ts` — SSE endpoint
- `src/app/api/activity/route.ts` — JSON fallback endpoint
- `src/server/utils/queries/activityQueries.ts` — UNION ALL query
- `src/app/_components/ActivityFeed.tsx` — client component

### Modified files
- `src/app/_components/HomePageSplash.tsx` — remove rotating subtitles, add ActivityFeed
- `src/app/page.tsx` — may need adjustment if layout changes

### Test files
- `src/server/utils/queries/__tests__/activityQueries.test.ts`
- `src/app/api/activity/__tests__/route.test.ts`

## Verification

1. Open homepage — feed loads with recent activity (initial JSON fetch)
2. SSE connects — new events appear without refresh as agents work
3. Click an artist name — navigates to artist page
4. Agent writes a mapping — appears in feed within 10s
5. No connection pool errors under normal load
6. Feed is empty-state friendly ("No recent activity" when DB is fresh)
