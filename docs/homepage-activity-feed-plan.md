# Homepage Live Activity Feed

## Context

The MusicNerdWeb homepage currently shows a static subtitle list ("Music Nerd", "Mindful Listener", etc.) rendered in static mode. With agents actively mapping thousands of artists and human contributors adding links, there's a compelling story to tell on the homepage — a live feed showing the site is alive and actively growing. This replaces the subtitle list with a polling activity feed that links visitors directly to artist pages.

## Requirements (from brainstorm)

- **Feed content**: Agent mappings, human UGC submissions, new artists added (no exclusions)
- **Visibility**: Public, no auth required
- **Layout**: Remove subtitle list. Keep logo, profile avatar, search. Uncomment footer. Feed goes below search.
- **Clickable**: Each item links to the artist page
- **Updates**: Client-side polling every 30s (not SSE — avoids holding function instances open on Vercel)
- **Size**: 15 most recent items visible

## Data sources

| Source | Table | Join | Example text |
|---|---|---|---|
| Agent mapping | `mcp_audit_log` WHERE action='resolve' | INNER JOIN artists ON artist_id | "Deezer ID mapped for **Mogwai**" |
| Human UGC | `ugcresearch` WHERE accepted=true | Has `name` field directly | "YouTube link added for **SENTO**" |
| New artist | `artists` | Has `name` field | "**Taylor Swift** added to the directory" |

### Index status

- `mcp_audit_log.created_at` — has DESC index (`idx_mcp_audit_log_created_at`). Ready.
- `ugcresearch.date_processed` — **no index exists**. Needs a migration to add `idx_ugcresearch_date_processed DESC`.
- `artists.created_at` — only exists as trailing column in composite index `(addedBy, createdAt)`. Needs a standalone `idx_artists_created_at DESC` index.

Both new indexes should be added in a Drizzle migration before or alongside this feature.

## Architecture

### API: `GET /api/activity`

JSON endpoint returning the most recent activity events. Public, no auth. Must include `export const dynamic = "force-dynamic"` since it reads from the database.

**Initial load** (no `since` param): Returns the 15 most recent events across all sources with no time filter. This ensures the feed always has content even during quiet periods.

**Polling updates** (`?since=<ISO timestamp>`): Returns events newer than the given timestamp, up to 15. Used by the client on subsequent polls.

**Response format**:
```json
[
  {
    "type": "agent_mapping",
    "artistId": "uuid",
    "artistName": "Mogwai",
    "platform": "deezer",
    "createdAt": "2025-03-27T12:00:00Z"
  },
  {
    "type": "ugc_approved",
    "artistId": "uuid",
    "artistName": "SENTO",
    "platform": "youtube",
    "createdAt": "2025-03-27T11:55:00Z"
  },
  {
    "type": "artist_added",
    "artistId": "uuid",
    "artistName": "Taylor Swift",
    "createdAt": "2025-03-27T11:00:00Z"
  }
]
```

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
 INNER JOIN artists a ON a.id = al.artist_id
 WHERE al.action = 'resolve' AND al.field LIKE 'mapping:%'
   AND ($since IS NULL OR al.created_at > $since)
 ORDER BY al.created_at DESC LIMIT $limit)

UNION ALL

(SELECT 'ugc_approved' AS type, u.artist_id, u.name AS artist_name,
        u.site_name AS platform, u.date_processed AS created_at
 FROM ugcresearch u
 WHERE u.accepted = true AND u.date_processed IS NOT NULL
   AND ($since IS NULL OR u.date_processed > $since)
 ORDER BY u.date_processed DESC LIMIT $limit)

UNION ALL

(SELECT 'artist_added' AS type, ar.id AS artist_id, ar.name AS artist_name,
        NULL AS platform, ar.created_at
 FROM artists ar
 WHERE ($since IS NULL OR ar.created_at > $since)
 ORDER BY ar.created_at DESC LIMIT $limit)

ORDER BY created_at DESC
LIMIT $limit
```

Single query, no N+1. Uses INNER JOIN for audit log entries to filter out orphaned records (deleted artists). The `$since` filter is NULL on initial load (returns most recent N items regardless of age) and set on polling updates.

### UI: Updated `HomePageSplash.tsx`

**Changes**:
- Remove the `titles` array, `SlidingText`/`TypewriterText` imports, and all subtitle rendering logic
- Uncomment the footer (currently commented out at bottom of file)
- Add `<ActivityFeed />` between search bar and footer

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
- Fetches `/api/activity` on mount (no `since` param — gets latest 15)
- Polls every 30s with `?since=<newest createdAt>` — merges new items into state
- New items animate in from the top using CSS transitions (`translateY` + opacity, no extra dependencies)
- Each item is a `<Link>` to `/artist/<id>`
- Shows relative time ("2m ago", "1h ago") — update display every 60s
- Icon prefix: 🤖 for agent, 👤 for human UGC, ✨ for new artist
- Compact single-line items, muted styling, artist name is the bold/highlighted part
- Caps displayed items at 15 (oldest items drop off as new ones arrive)
- Empty state: "No recent activity" with muted styling

### Connection pool safety

Client polls every 30s. Each poll runs 1 lightweight query (UNION ALL with LIMIT 15, single DB connection). Even with 100 concurrent homepage visitors, worst case is ~3 queries/sec. Well within the connection pool.

## Files

### New files
- `src/app/api/activity/route.ts` — JSON endpoint (`force-dynamic`)
- `src/server/utils/queries/activityQueries.ts` — UNION ALL query
- `src/app/_components/ActivityFeed.tsx` — client component

### Modified files
- `src/app/_components/HomePageSplash.tsx` — remove subtitle list, uncomment footer, add ActivityFeed
- `src/app/page.tsx` — may need adjustment if layout changes

### Migration
- Add `idx_ugcresearch_date_processed` (DESC) on `ugcresearch.date_processed`
- Add `idx_artists_created_at` (DESC) on `artists.created_at`

### Test files
- `src/server/utils/queries/__tests__/activityQueries.test.ts`
- `src/app/api/activity/__tests__/route.test.ts`
- `src/app/_components/__tests__/ActivityFeed.test.tsx`

## Verification

1. Open homepage — feed loads with 15 most recent items (even if activity is days old)
2. Wait 30s — new events appear with slide-in animation as polling picks them up
3. Click an artist name — navigates to artist page
4. Agent writes a mapping — appears in feed within ~30s
5. No "null" artist names in the feed (INNER JOIN filters orphaned audit entries)
6. Feed shows "No recent activity" on a fresh database with no data
7. Relative timestamps update periodically ("2m ago" → "3m ago")
