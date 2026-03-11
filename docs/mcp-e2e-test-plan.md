# MCP Artist Link Tools — E2E Test Plan

## Prerequisites

### 1. Dev server running
```bash
npm run dev
```
The MCP endpoint is at `https://localhost:3000/api/mcp`.

### 2. Provision a test API key
```bash
export MCP_KEY=$(openssl rand -hex 32)
echo "Test key (save this): $MCP_KEY"

# Insert into devdb
echo "INSERT INTO mcp_api_keys (key_hash, label) VALUES (encode(sha256('$MCP_KEY'::bytea), 'hex'), 'e2e-test');" | psql $SUPABASE_DB_CONNECTION
```

### 3. Pick a test artist
```bash
# Find an artist ID to use for testing
echo "SELECT id, name FROM artists LIMIT 5;" | psql $SUPABASE_DB_CONNECTION
```
Set `ARTIST_ID` to a real artist UUID from devdb.

### 4. Helper: MCP JSON-RPC call
All MCP calls use JSON-RPC 2.0 over POST. Helper function:

```bash
mcp_call() {
  local method="$1"
  local params="$2"
  local auth_header="${3:+Authorization: Bearer $3}"

  curl -s -k https://localhost:3000/api/mcp \
    -H "Content-Type: application/json" \
    ${auth_header:+-H "$auth_header"} \
    -d "{
      \"jsonrpc\": \"2.0\",
      \"id\": 1,
      \"method\": \"tools/call\",
      \"params\": {
        \"name\": \"$method\",
        \"arguments\": $params
      }
    }" | python3 -m json.tool
}
```

---

## Test Cases

### Section A: Health Check & Discovery

#### A1. GET health check
```bash
curl -s -k https://localhost:3000/api/mcp | python3 -m json.tool
```
**Expected**: `{ "name": "Music Nerd", "version": "1.0.0", "status": "ok", "protocol": "mcp", "transport": "streamable-http" }`

#### A2. Tool listing
```bash
curl -s -k https://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | python3 -m json.tool
```
**Expected**: Response includes all 4 tools: `search_artists`, `get_artist`, `set_artist_link`, `delete_artist_link`

---

### Section B: Read-Only Tools (No Auth Required)

#### B1. search_artists — no auth header
```bash
mcp_call "search_artists" '{"query": "Drake"}'
```
**Expected**: Success. Returns array of artist summaries. No auth error.

#### B2. search_artists — empty query
```bash
mcp_call "search_artists" '{"query": ""}'
```
**Expected**: Success. Returns `{ "artists": [], "totalResults": 0 }`.

#### B3. get_artist — valid ID, no auth
```bash
mcp_call "get_artist" "{\"id\": \"$ARTIST_ID\"}"
```
**Expected**: Success. Returns full artist detail object.

#### B4. get_artist — nonexistent ID
```bash
mcp_call "get_artist" '{"id": "00000000-0000-0000-0000-000000000000"}'
```
**Expected**: Error with `code: "NOT_FOUND"`.

#### B5. get_artist — invalid UUID format
```bash
mcp_call "get_artist" '{"id": "not-a-uuid"}'
```
**Expected**: Zod validation error (invalid UUID).

---

### Section C: Auth Enforcement

#### C1. set_artist_link — no auth header
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://instagram.com/testuser\"}"
```
**Expected**: Error with `code: "AUTH_REQUIRED"`.

#### C2. delete_artist_link — no auth header
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"instagram\"}"
```
**Expected**: Error with `code: "AUTH_REQUIRED"`.

#### C3. set_artist_link — invalid API key
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://instagram.com/testuser\"}" "invalid-key-12345"
```
**Expected**: HTTP 401 response with `"Invalid or revoked API key"`.

#### C4. set_artist_link — valid auth header, read-only tools still work
```bash
mcp_call "search_artists" '{"query": "Drake"}' "$MCP_KEY"
```
**Expected**: Success. Auth header on read-only tools is accepted (not required but not rejected).

---

### Section D: set_artist_link — Happy Path

#### D1. Set an Instagram link
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://instagram.com/testartist\"}" "$MCP_KEY"
```
**Expected**: Success response with:
- `success: true`
- `siteName: "instagram"`
- `extractedId: "testartist"`
- `oldValue: null` (or previous value if already set)

#### D2. Verify the link was written to the DB
```bash
echo "SELECT instagram FROM artists WHERE id = '$ARTIST_ID';" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: `instagram = "testartist"`

#### D3. Verify audit log entry
```bash
echo "SELECT field, action, old_value, new_value, submitted_url FROM mcp_audit_log WHERE artist_id = '$ARTIST_ID' ORDER BY created_at DESC LIMIT 1;" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: Row with `field=instagram, action=set, new_value=testartist, submitted_url=https://instagram.com/testartist`

#### D4. Overwrite an existing link
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://instagram.com/newartistname\"}" "$MCP_KEY"
```
**Expected**: Success with `oldValue: "testartist"`, `extractedId: "newartistname"`

#### D5. Set a Spotify link (bio-relevant column)
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://open.spotify.com/artist/4q3ewBCX7sLwd24euuV69X\"}" "$MCP_KEY"
```
**Expected**: Success. Verify in DB that `spotify` is set AND `bio` is set to NULL (bio regeneration triggered).

#### D6. Set a YouTube link
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://youtube.com/@testchannel\"}" "$MCP_KEY"
```
**Expected**: Success with `siteName: "youtube"`, `extractedId: "testchannel"` (no `@` prefix).

#### D7. Set a Twitter/X link
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://x.com/testhandle\"}" "$MCP_KEY"
```
**Expected**: Success with `siteName: "x"`, `extractedId: "testhandle"`.

---

### Section E: set_artist_link — Error Cases

#### E1. Nonexistent artist
```bash
mcp_call "set_artist_link" "{\"artistId\": \"00000000-0000-0000-0000-000000000000\", \"url\": \"https://instagram.com/test\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "NOT_FOUND"`.

#### E2. Unrecognized URL
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://example.com/not-a-platform\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "INVALID_URL"`.

#### E3. Invalid URL format
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"not-a-url\"}" "$MCP_KEY"
```
**Expected**: Zod validation error (url format).

#### E4. Invalid artist ID format
```bash
mcp_call "set_artist_link" "{\"artistId\": \"not-a-uuid\", \"url\": \"https://instagram.com/test\"}" "$MCP_KEY"
```
**Expected**: Zod validation error (uuid format).

---

### Section F: delete_artist_link — Happy Path

#### F1. Delete the Instagram link (set in D1/D4)
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"instagram\"}" "$MCP_KEY"
```
**Expected**: Success with `oldValue: "newartistname"` (from D4).

#### F2. Verify the link was cleared in DB
```bash
echo "SELECT instagram FROM artists WHERE id = '$ARTIST_ID';" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: `instagram = NULL`

#### F3. Verify audit log entry for deletion
```bash
echo "SELECT field, action, old_value, new_value FROM mcp_audit_log WHERE artist_id = '$ARTIST_ID' AND action = 'delete' ORDER BY created_at DESC LIMIT 1;" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: Row with `field=instagram, action=delete, old_value=newartistname, new_value=NULL`

#### F4. Delete a bio-relevant link
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"spotify\"}" "$MCP_KEY"
```
**Expected**: Success. Verify `spotify = NULL` and `bio = NULL` in DB.

---

### Section G: delete_artist_link — Error Cases

#### G1. Delete already-null link
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"instagram\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "NOT_SET"` (already deleted in F1).

#### G2. Invalid platform name
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"fakeplatform\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "INVALID_PLATFORM"`.

#### G3. System column rejected
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"name\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "INVALID_PLATFORM"` (system columns are not in whitelist).

#### G4. Wallets rejected
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"siteName\": \"wallets\"}" "$MCP_KEY"
```
**Expected**: Error (wallets must be managed through dedicated operations).

#### G5. Nonexistent artist
```bash
mcp_call "delete_artist_link" "{\"artistId\": \"00000000-0000-0000-0000-000000000000\", \"siteName\": \"instagram\"}" "$MCP_KEY"
```
**Expected**: Error with `code: "NOT_FOUND"`.

---

### Section H: Key Revocation

#### H1. Revoke the test key
```bash
echo "UPDATE mcp_api_keys SET revoked_at = now() WHERE label = 'e2e-test';" | psql $SUPABASE_DB_CONNECTION
```

#### H2. Attempt write with revoked key
```bash
mcp_call "set_artist_link" "{\"artistId\": \"$ARTIST_ID\", \"url\": \"https://instagram.com/shouldfail\"}" "$MCP_KEY"
```
**Expected**: HTTP 401 with `"Invalid or revoked API key"`.

#### H3. Read-only tools still work without auth after revocation
```bash
mcp_call "search_artists" '{"query": "Drake"}'
```
**Expected**: Success. Read tools are unaffected by key revocation.

---

### Section I: Audit Log Integrity

#### I1. Verify complete audit trail
```bash
echo "SELECT field, action, old_value, new_value, submitted_url, created_at FROM mcp_audit_log WHERE artist_id = '$ARTIST_ID' ORDER BY created_at ASC;" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: Chronological entries matching all set/delete operations from sections D and F. Each entry should have a non-null `api_key_hash` and `created_at`.

#### I2. Audit log has no UPDATE/DELETE access
```bash
echo "DELETE FROM mcp_audit_log WHERE artist_id = '$ARTIST_ID';" | psql $SUPABASE_DB_CONNECTION
```
**Expected**: Permission denied (RLS only allows SELECT + INSERT for `mnweb` role). Run this as the `mnweb` role, not superuser.

---

## Cleanup

After testing, restore the artist to its original state and clean up:

```bash
# Remove test audit log entries (as superuser, not mnweb)
echo "DELETE FROM mcp_audit_log WHERE api_key_hash IN (SELECT key_hash FROM mcp_api_keys WHERE label = 'e2e-test');" | psql $SUPABASE_DB_CONNECTION

# Remove the test API key
echo "DELETE FROM mcp_api_keys WHERE label = 'e2e-test';" | psql $SUPABASE_DB_CONNECTION

# Reset any modified artist fields to their original values
# (manual — depends on what was set during testing)
```

---

## Test Matrix Summary

| Section | Tests | Auth Required | Covers |
|---------|-------|---------------|--------|
| A | 2 | No | Health check, tool discovery |
| B | 5 | No | Read-only tools, backward compat |
| C | 4 | Mixed | Auth enforcement, 401 for bad keys |
| D | 7 | Yes | set_artist_link happy paths |
| E | 4 | Yes | set_artist_link error cases |
| F | 4 | Yes | delete_artist_link happy paths |
| G | 5 | Yes | delete_artist_link error cases |
| H | 3 | Mixed | Key revocation flow |
| I | 2 | N/A | Audit log integrity + RLS |
| **Total** | **36** | | |
