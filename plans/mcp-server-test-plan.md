# MCP Server Manual Test Plan

## Setup

1. **Start the dev server** in a terminal:
   ```bash
   cd /Users/clt/src/xdjs/mn-mcp
   npm run dev
   ```

2. **Restart Claude Desktop** to pick up the new config

---

## Test Cases

### Test 1: Health Check (curl)

```bash
curl -k https://localhost:3000/api/mcp
```

**Expected:**
```json
{"name":"musicnerd","version":"1.0.0","status":"ok","protocol":"mcp","transport":"streamable-http"}
```

---

### Test 2: search_artists - Normal Query

In Claude Desktop, ask:
> "Use musicnerd to search for artists named 'Daft Punk'"

**Expected:** Returns array of artist summaries with `id` and `name`

---

### Test 3: search_artists - Empty Query

> "Use musicnerd to search for artists with an empty query"

**Expected:**
```json
{ "artists": [], "totalResults": 0 }
```

---

### Test 4: search_artists - With Limit

> "Use musicnerd to search for artists named 'the' with a limit of 3"

**Expected:** Returns at most 3 results

---

### Test 5: get_artist - Valid ID

First, get an ID from search_artists, then:
> "Use musicnerd to get details for artist ID [paste-id-here]"

**Expected:** Returns full artist detail with:
- `id`
- `name`
- `bio` (may be null)
- `spotifyId` (may be null)
- `socialLinks` object with `{ handle, url }` for each platform

---

### Test 6: get_artist - Invalid ID

> "Use musicnerd to get details for artist ID 'not-a-valid-uuid'"

**Expected:**
```json
{ "error": "Invalid artist ID format - must be a valid UUID", "code": "INVALID_INPUT" }
```

---

### Test 7: get_artist - Non-existent ID

> "Use musicnerd to get details for artist ID '00000000-0000-0000-0000-000000000000'"

**Expected:**
```json
{ "error": "Artist not found", "code": "NOT_FOUND" }
```

---

### Test 8: End-to-End Flow

> "Using musicnerd, find information about Metallica and tell me their social media links"

**Expected:** Claude searches for Metallica, gets the artist details, and presents the social links

---

## Verification Checklist

| Test | Status |
|------|--------|
| Health check returns server info | ⬜ |
| search_artists returns results | ⬜ |
| Empty query returns empty array | ⬜ |
| Limit parameter works | ⬜ |
| get_artist returns full details | ⬜ |
| Invalid UUID returns INVALID_INPUT | ⬜ |
| Non-existent ID returns NOT_FOUND | ⬜ |
| Social links include handle AND url | ⬜ |

---

## Claude Desktop Configuration

**File:** `~/Library/Application Support/Claude/claude_desktop_config.json`

### Option 1: Using mcp-remote bridge
```json
{
  "mcpServers": {
    "musicnerd-local": {
      "command": "npx",
      "args": ["mcp-remote", "https://localhost:3000/api/mcp"]
    }
  }
}
```

### Option 2: Native HTTP type (newer Claude versions)
```json
{
  "mcpServers": {
    "musicnerd-local": {
      "type": "http",
      "url": "https://localhost:3000/api/mcp"
    }
  }
}
```

### Production Configuration
```json
{
  "mcpServers": {
    "musicnerd": {
      "type": "http",
      "url": "https://musicnerd.xyz/api/mcp"
    }
  }
}
```
