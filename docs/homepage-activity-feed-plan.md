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
- Remove the "Ask Music Nerd about an artist" text and the inline `<SearchBar>` (the nav bar already has one)
- Remove the inline `<Login>` button (the nav bar already has one)
- Remove the commented-out footer (the root layout's `<Footer />` handles it)
- Replace all of the above with a "music nerd" title + `<ActivityFeed />`

**Prototype**: `src/app/prototype/page.tsx` — live reference with mock data and simulated streaming. Run `npm run dev` and visit `/prototype`.

**Layout** (top to bottom):
```
┌─────────────────────────────────────────────────┐
│ [logo]  [ Search for an artist... ] [+] [avatar] │  ← nav bar (unchanged)
│                                                   │
│                 music nerd                         │  ← brand pink, fluid 32-84px
│                  ● LIVE                            │  ← pulsing green dot
│                                                   │
│  ▌ Tidal ID mapped for Amon Tobin           now   │  ← cyan bar (agent)
│  ▌ Deezer ID mapped for Mogwai               2m   │  ← cyan bar (agent)
│  ▌ YouTube link added for SENTO              5m   │  ← pink bar (human UGC)
│  ▌ Taylor Swift added to directory           1h   │  ← green bar (new artist)
│  ▌ Deezer ID mapped for Lethal Bizzle        1h   │
│  ...                                              │
│                                                   │
│  Made in Seattle by @cxy @clt and friends         │  ← root layout <Footer />
└─────────────────────────────────────────────────┘
```

### Design details

**Title**: "music nerd" in brand pink (`#ff9ce3`), lowercase, bold, fluid clamp 32-84px with tight letter-spacing. Subtle pink text-shadow glow in both themes.

**Live indicator**: Pulsing green dot (Tailwind `animate-ping`) + "LIVE" label in small uppercase tracking. Replaces the old "LIVE ACTIVITY" divider with horizontal rules.

**Feed items**: Each row is a `<Link>` to `/artist/<id>` with three elements:
1. **Type indicator bar** — 3px-wide rounded pill on the left edge, color-coded by event type. Grows from h-4 to h-5 on hover.
2. **Event text** — 13px, truncated. Artist name rendered as `<strong>` in brand pink (`#ff9ce3`) in both themes.
3. **Timestamp** — 11px, right-aligned, compact format: `now`, `2m`, `1h`, `3d` (no "ago" suffix). Refreshes every 30s.

**Opacity cascade**: Items fade from `opacity: 1` (newest) to `opacity: 0.45` (oldest) via `1 - index * 0.035`, giving visual depth.

**Fresh item highlight**: Newly polled items get a green-tinted background (`--feed-fresh-bg`) and green timestamp for 3 seconds, then settle to default.

**Entry animation**: `fadeSlideIn` keyframe (defined in `tailwind.config.ts`) — `translateY(-8px)` + `opacity: 0` to settled position. Staggered with `animationDelay: index * 30ms`.

### Theme colors (CSS custom properties)

Colors are defined as CSS custom properties on a `.feed-root` wrapper, toggled via `.dark .feed-root`. This keeps all theme logic in one place with zero runtime cost.

| Variable | Light mode | Dark mode | Usage |
|---|---|---|---|
| `--feed-title` | `#ff9ce3` | `#ff9ce3` | "music nerd" title |
| `--feed-title-glow` | `rgba(255,156,227,0.2)` | `rgba(255,156,227,0.3)` | Title text-shadow |
| `--feed-body` | `#5a4d5e` | `#c6bfc7` | Event description text |
| `--feed-body-hover` | `#3d2f42` | `#e0d8e2` | Event text on hover |
| `--feed-artist` | `#ff9ce3` | `#ff9ce3` | Artist name (`<strong>`) |
| `--feed-timestamp` | `#9b8a9f` | `rgba(198,191,199,0.35)` | Timestamp text |
| `--feed-timestamp-dim` | `rgba(155,138,159,0.4)` | `rgba(198,191,199,0.25)` | Timestamp at rest |
| `--feed-live-dot` | `#059669` | `#19ffb8` | Pulsing live dot |
| `--feed-live-label` | `rgba(90,77,94,0.6)` | `rgba(198,191,199,0.6)` | "LIVE" label |
| `--feed-bar-agent` | `#0891b2` | `#2ad4fc` | Agent mapping type bar |
| `--feed-bar-ugc` | `#c44a8c` | `#ff9ce3` | Human UGC type bar |
| `--feed-bar-new` | `#059669` | `#19ffb8` | New artist type bar |
| `--feed-hover-bg` | `rgba(90,77,94,0.07)` | `rgba(198,191,199,0.08)` | Row hover background |
| `--feed-fresh-bg` | `rgba(5,150,105,0.06)` | `rgba(25,255,184,0.06)` | Fresh item background |
| `--feed-fresh-time` | `rgba(5,150,105,0.7)` | `rgba(25,255,184,0.7)` | Fresh item timestamp |

Light mode uses the same brand pink for title and artist names. Body text and type bars use deeper, saturated variants for contrast on white backgrounds.

**New component**: `ActivityFeed.tsx` (client component)
- Fetches `/api/activity` on mount (no `since` param — gets latest 15)
- Polls every 30s with `?since=<newest createdAt>` — merges new items into state
- New items animate in via `fadeSlideIn` keyframe (already in `tailwind.config.ts`)
- Each item is a `<Link>` to `/artist/<id>`
- Relative timestamps (`now`, `2m`, `1h`, `3d`) — re-rendered every 30s
- Type indicator bars instead of emoji icons (color-coded, see theme table above)
- Opacity cascade: newest items bright, oldest items faded
- Fresh item highlight: green-tinted bg for 3s on new arrivals
- Caps displayed items at 15 (oldest items drop off as new ones arrive)
- Empty state: "Waiting for activity..." with muted styling
- **Accessibility**: The feed `<ul>` must have `aria-live="polite"` and `aria-label="Recent activity"` so screen readers announce new items. Use `aria-live="polite"` (not `"assertive"`) since the feed updates are informational, not urgent.

### Connection pool safety

Client polls every 30s. Each poll runs 1 lightweight query (UNION ALL with LIMIT 15, single DB connection). Even with 100 concurrent homepage visitors, worst case is ~3 queries/sec. Well within the connection pool.

## Files

### New files
- `src/app/api/activity/route.ts` — JSON endpoint (`force-dynamic`)
- `src/server/utils/queries/activityQueries.ts` — UNION ALL query
- `src/app/_components/ActivityFeed.tsx` — client component

### Modified files
- `src/app/_components/HomePageSplash.tsx` — gut the subtitle/search/login/footer content, replace with "music nerd" title + `<ActivityFeed />`
- `src/app/page.tsx` — may need adjustment if layout changes
- `tailwind.config.ts` — already has `fadeSlideIn` keyframe/animation (added during prototype)

### Migration
- Add `idx_ugcresearch_date_processed` (DESC) on `ugcresearch.date_processed`
- Add `idx_artists_created_at` (DESC) on `artists.created_at`

### Test files
- `src/server/utils/queries/__tests__/activityQueries.test.ts`
- `src/app/api/activity/__tests__/route.test.ts`
- `src/app/_components/__tests__/ActivityFeed.test.tsx`

## Verification

1. Open homepage — feed loads with 15 most recent items (even if activity is days old)
2. Wait 30s — new events appear with slide-in animation and green highlight, then settle
3. Click an artist name — navigates to artist page
4. Agent writes a mapping — appears in feed within ~30s
5. No "null" artist names in the feed (INNER JOIN filters orphaned audit entries)
6. Feed shows "Waiting for activity..." on a fresh database with no data
7. Relative timestamps update every 30s (`now` → `1m` → `2m`)
8. Type bars are color-coded: cyan (agent), pink (human UGC), green (new artist)
9. Older items fade via opacity cascade — newest bright, oldest dim
10. Light mode: pink title/artist names pop on white, body text is dark mauve, type bars use saturated variants
11. Dark mode: neon pink/cyan/green palette with subtle glow on title
12. Pulsing green "LIVE" dot animates continuously
13. Footer ("Made in Seattle...") is above the fold on both desktop and mobile
