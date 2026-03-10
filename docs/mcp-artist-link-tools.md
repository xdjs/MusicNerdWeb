# MCP Artist Link Tools — Implementation Plan

## Overview

Add two new secured MCP tools (`set_artist_link`, `delete_artist_link`) that allow internal agents to modify artist platform links. Before building these tools, refactor existing code to eliminate duplication and SRP violations, ensuring the new tools share the same code paths as UGC submissions.

## Architecture

```
MCP route.ts (auth gate)
  └─> server.ts (tool registration)
        ├─> set_artist_link
        │     ├─ extractArtistId(url)        ← existing, refactored
        │     ├─ setArtistLink(artistId, siteName, value)  ← new helper
        │     └─ audit log write
        └─> delete_artist_link
              ├─ validate siteName against urlmap
              ├─ clearArtistLink(artistId, siteName)       ← new helper
              └─ audit log write
```

## Dependency Graph

```
Phase 1A ──────────┐
(extractArtistId)  ├──> Phase 2A ──────────┐
                   │    (link helpers)      │
Phase 1B ──────────┤                       ├──> Phase 3 ──────> Phase 4
(schema)           ├──> Phase 2B           │    (MCP tools)     (integration)
                   │    (MCP auth)         │
                   └───────────────────────┘
```

- **1A and 1B** are independent and can run in parallel.
- **2A** depends on 1A. **2B** depends on 1B. 2A and 2B can run in parallel.
- **Phase 3** depends on 2A and 2B.
- **Phase 4** depends on 3.

---

## Phase 1A: Refactor `extractArtistId()` to Return Storage-Ready Values

**Branch:** `refactor/extract-artist-id-storage-ready`
**PR target:** `feature/mcp-artist-link-tools` (long-lived feature branch off `main`)

### Problem

`extractArtistId()` returns `@username` for YouTube, but the storage layer (`approveUGC`) immediately strips the `@` prefix. This leaky abstraction forces every caller to post-process the result.

### Changes

**File: `src/server/utils/services.ts`**

1. In the `youtubechannel` block (lines 110-125): change `@` prefix logic — return plain username without `@`:
   - `id: atUsername.startsWith('@') ? atUsername.substring(1) : atUsername` (instead of adding `@`)
   - Same for `plainUsername`
2. In the `youtube` block (lines 129-154): same change — return plain username without `@`.
3. No other platforms are affected.

**File: `src/server/utils/__tests__/services.test.ts`**

Update all YouTube username test expectations from `"@artistname"` to `"artistname"`, `"@fkj"` to `"fkj"`, etc.

**File: `src/server/utils/__tests__/extractArtistId.test.ts`**

No YouTube tests here (only X, Wikipedia, Facebook), so no changes needed.

**File: `src/app/artist/[id]/_components/AddArtistData.tsx`** (if applicable)

This file is client-side. It calls `extractArtistId` indirectly via `addArtistDataAction` which already passes the raw URL. No changes needed.

**File: `src/server/utils/queries/artistQueries.ts`**

The `approveUGC()` youtube normalization (lines 449-464) now becomes a no-op since `extractArtistId` already returns the storage-ready value. However, **do not remove that code in this phase** — leave it in place as a defensive passthrough. It will be removed in Phase 2A when we extract `setArtistLink()`.

### Acceptance Tests

All automated. Run: `npm run test`

| # | Test | Validates |
|---|------|-----------|
| AT-1 | `services.test.ts` — YouTube @username tests expect `id: "artistname"` (no `@`) | New return format |
| AT-2 | `services.test.ts` — YouTube plain username tests expect `id: "artistname"` (no `@`) | New return format |
| AT-3 | `services.test.ts` — YouTube channel ID tests still expect `id: "UC..."` | No regression on channel IDs |
| AT-4 | `extractArtistId.test.ts` — all X/Wikipedia/Facebook tests pass unchanged | No regression on other platforms |
| AT-5 | `services.test.ts` — TikTok tests pass unchanged | No regression |
| AT-6 | All existing tests pass: `npm run test` | Full regression |
| AT-7 | CI gate passes: `npm run type-check && npm run lint && npm run test && npm run build` | Full CI |

---

## Phase 1B: Schema Changes (New Tables)

**Branch:** `feature/mcp-schema`
**PR target:** `feature/mcp-artist-link-tools`

### New Tables

#### `mcp_api_keys`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `uuid_generate_v4()` |
| `key_hash` | `text` | NOT NULL, UNIQUE |
| `label` | `text` | NOT NULL (agent name/description) |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |
| `revoked_at` | `timestamp with time zone` | nullable |

#### `mcp_audit_log`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, default `uuid_generate_v4()` |
| `artist_id` | `uuid` | NOT NULL, FK → `artists.id` |
| `field` | `text` | NOT NULL (the `siteName` from urlmap) |
| `action` | `text` | NOT NULL (`'set'` or `'delete'`) |
| `submitted_url` | `text` | nullable (raw URL for set actions) |
| `old_value` | `text` | nullable |
| `new_value` | `text` | nullable |
| `api_key_hash` | `text` | NOT NULL |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` |

Index: `idx_mcp_audit_log_artist_id` on `artist_id`.

### Changes

**File: `src/server/db/schema.ts`**

Add `mcpApiKeys` and `mcpAuditLog` table definitions with Drizzle ORM, following existing patterns (pgPolicy for `mnweb` role, same style as other tables).

**File: `src/server/db/DbTypes.ts`** (if types are manually maintained)

Add inferred types for the new tables.

### Commands

```bash
npm run db:generate   # Generate migration
npm run db:push       # Push to dev DB (or db:migrate)
```

### Acceptance Tests

| # | Test | Type |
|---|------|------|
| AT-1 | `npm run type-check` passes — schema compiles | Automated |
| AT-2 | `npm run build` passes | Automated |
| AT-3 | `npm run db:generate` produces a migration file | Automated |
| AT-4 | Migration applies to dev database without errors | **Manual** — notify reviewer to run `npm run db:push` against dev |

---

## Phase 2A: Extract `setArtistLink()` and `clearArtistLink()` Helpers

**Branch:** `refactor/artist-link-helpers`
**PR target:** `feature/mcp-artist-link-tools`
**Depends on:** Phase 1A merged

### Problem

The logic for writing a link value to the `artists` table (column sanitization, wallets/ens special cases, bio regeneration) is duplicated across `approveUGC()` and `removeArtistData()`. Both also maintain separate copies of the `promptRelevantColumns` array.

### New Code

**File: `src/server/utils/queries/artistLinkService.ts`** (new file)

```typescript
// Constants
export const BIO_RELEVANT_COLUMNS = ["spotify", "instagram", "x", "soundcloud", "youtube", "youtubechannel"];

// Sanitize a siteName to a safe SQL column identifier
export function sanitizeColumnName(siteName: string): string {
  return siteName.replace(/[^a-zA-Z0-9_]/g, "");
}

// Set a platform link on an artist record.
// Handles wallets (array_append), ens, and generic text columns.
// Triggers bio regeneration for prompt-relevant columns.
export async function setArtistLink(
  artistId: string,
  siteName: string,
  value: string
): Promise<void>

// Clear (null out) a platform link on an artist record.
// Handles wallets (array_remove) and generic text columns.
// Triggers bio regeneration for prompt-relevant columns.
export async function clearArtistLink(
  artistId: string,
  siteName: string
): Promise<void>
```

The implementation is extracted verbatim from the existing `approveUGC()` write logic (lines 428-488) and `removeArtistData()` write logic (lines 633-648), with these improvements:

1. **Remove youtube normalization from the helper** — Phase 1A guarantees `extractArtistId()` returns storage-ready values. The helper trusts its input.
2. **Single `BIO_RELEVANT_COLUMNS` constant** — replaces two separate inline arrays.
3. **`sanitizeColumnName()` exported** — can be unit tested independently.

### Modifications to Existing Code

**File: `src/server/utils/queries/artistQueries.ts`**

1. **`approveUGC()`**: Remove lines 427-488 (column sanitization, youtube normalization, the SQL UPDATE, bio regen). Replace with:
   ```typescript
   await setArtistLink(artistId, siteName, artistUrlOrId);
   await db.update(ugcresearch).set({ accepted: true }).where(eq(ugcresearch.id, ugcId));
   ```

2. **`removeArtistData()`**: Remove lines 633-648 (column sanitization, SQL UPDATE, bio regen). Replace with:
   ```typescript
   await clearArtistLink(artistId, siteName);
   ```
   Keep the auth check and UGC comment as-is.

### Tests (TDD)

**File: `src/server/utils/queries/__tests__/artistLinkService.test.ts`** (new file)

Write tests **before** implementation:

| # | Test case |
|---|-----------|
| 1 | `sanitizeColumnName` strips non-alphanumeric/underscore characters |
| 2 | `sanitizeColumnName` passes through clean names unchanged |
| 3 | `setArtistLink` — sets a generic text column (e.g., instagram) via `sql.identifier` |
| 4 | `setArtistLink` — appends to wallets array, avoids duplicates |
| 5 | `setArtistLink` — sets ens directly |
| 6 | `setArtistLink` — triggers bio regeneration for prompt-relevant column (instagram) |
| 7 | `setArtistLink` — does NOT trigger bio regeneration for non-relevant column (tiktok) |
| 8 | `clearArtistLink` — nulls a generic text column |
| 9 | `clearArtistLink` — handles wallets (array_remove) |
| 10 | `clearArtistLink` — triggers bio regeneration for prompt-relevant column |
| 11 | `clearArtistLink` — does NOT trigger bio regeneration for non-relevant column |

### Acceptance Tests

All automated. Run: `npm run test`

| # | Test | Validates |
|---|------|-----------|
| AT-1 | `artistLinkService.test.ts` — all 11 cases green | New helpers work correctly |
| AT-2 | `removeArtistData.test.ts` — existing tests pass unchanged | `removeArtistData` refactor didn't break behavior |
| AT-3 | `removeArtistData route.test.ts` — existing tests pass unchanged | API layer unaffected |
| AT-4 | `services.test.ts` — all pass | No regression |
| AT-5 | `addArtistData-discord.test.ts` — passes | UGC submission flow unaffected |
| AT-6 | Full test suite: `npm run test` | Full regression |
| AT-7 | CI gate: `npm run type-check && npm run lint && npm run test && npm run build` | Full CI |

---

## Phase 2B: MCP Auth Helper

**Branch:** `feature/mcp-auth`
**PR target:** `feature/mcp-artist-link-tools`
**Depends on:** Phase 1B merged (needs `mcp_api_keys` table)

### New Code

**File: `src/app/api/mcp/auth.ts`** (new file)

```typescript
import crypto from "crypto";

// Hash an API key using SHA-256 for comparison against stored hashes
export function hashApiKey(key: string): string

// Validate a Bearer token from the Authorization header.
// Returns the key hash if valid, null if invalid or revoked.
export async function validateMcpApiKey(request: Request): Promise<string | null>
```

Implementation:
1. Extract `Authorization` header from request.
2. Parse `Bearer <key>` format.
3. SHA-256 hash the key.
4. Look up hash in `mcp_api_keys` where `revoked_at IS NULL`.
5. Return the hash string on success (for audit logging), or `null`.

### Tests (TDD)

**File: `src/app/api/mcp/__tests__/auth.test.ts`** (new file)

| # | Test case |
|---|-----------|
| 1 | `hashApiKey` — produces consistent SHA-256 hex digest |
| 2 | `hashApiKey` — different inputs produce different hashes |
| 3 | `validateMcpApiKey` — returns hash for valid, non-revoked key |
| 4 | `validateMcpApiKey` — returns null when no Authorization header |
| 5 | `validateMcpApiKey` — returns null for malformed header (not Bearer) |
| 6 | `validateMcpApiKey` — returns null for unknown key (not in DB) |
| 7 | `validateMcpApiKey` — returns null for revoked key (revoked_at is set) |

### Acceptance Tests

All automated. Run: `npm run test`

| # | Test | Validates |
|---|------|-----------|
| AT-1 | `auth.test.ts` — all 7 cases green | Auth helper works correctly |
| AT-2 | Full test suite: `npm run test` | No regression |
| AT-3 | CI gate: `npm run type-check && npm run lint && npm run test && npm run build` | Full CI |

---

## Phase 3: MCP Tools (`set_artist_link`, `delete_artist_link`)

**Branch:** `feature/mcp-link-tools`
**PR target:** `feature/mcp-artist-link-tools`
**Depends on:** Phase 2A and Phase 2B merged

### Changes

**File: `src/app/api/mcp/server.ts`**

Register two new tools:

#### `set_artist_link`

- **Input:** `artistId` (UUID), `url` (string)
- **Requires auth:** Yes (validated via request context)
- **Flow:**
  1. Validate `artistId` exists in `artists` table
  2. Call `extractArtistId(url)` — returns `{ siteName, id }` or null
  3. If null, return error: "URL does not match any approved platform"
  4. Read current value of `artist[siteName]` (for audit `oldValue`)
  5. Call `setArtistLink(artistId, siteName, id)`
  6. Write to `mcp_audit_log`: action=`set`, field=siteName, submittedUrl=url, oldValue, newValue=id, apiKeyHash from context
  7. Return success with siteName, extracted ID, and old value

#### `delete_artist_link`

- **Input:** `artistId` (UUID), `siteName` (string)
- **Requires auth:** Yes
- **Flow:**
  1. Validate `artistId` exists
  2. Validate `siteName` exists in `urlmap` table
  3. Read current value of `artist[siteName]` (for audit `oldValue`)
  4. If current value is already null, return error: "Link is not set"
  5. Call `clearArtistLink(artistId, siteName)`
  6. Write to `mcp_audit_log`: action=`delete`, field=siteName, oldValue, apiKeyHash from context
  7. Return success with siteName and old value

### Auth Context Threading

**File: `src/app/api/mcp/route.ts`**

The MCP SDK operates as a stateless transport. Since the `server` instance is a singleton and tool handlers are registered at module load time, we cannot pass per-request auth context directly to tool handlers via function arguments.

**Solution: Use Node.js `AsyncLocalStorage`.**

**File: `src/app/api/mcp/request-context.ts`** (new file)

```typescript
import { AsyncLocalStorage } from "node:async_hooks";

export type McpRequestContext = {
  apiKeyHash: string;
};

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>();
```

**File: `src/app/api/mcp/route.ts`** (modified)

In the `POST` handler, before calling `handleMcpRequest`:
1. Call `validateMcpApiKey(req)`
2. If null, return 401 JSON-RPC error
3. Wrap `handleMcpRequest(req)` in `mcpRequestContext.run({ apiKeyHash }, ...)`

Read-only tools (`search_artists`, `get_artist`) remain accessible without auth — the auth gate only applies when a tool handler calls `mcpRequestContext.getStore()`. Alternatively, we can make auth mandatory for all POST requests. **Decision: make auth optional at the route level; individual tools that require auth call a helper that reads from AsyncLocalStorage and throws if not present.** This preserves backward compatibility for read-only tools.

**File: `src/app/api/mcp/auth.ts`** (modified)

Add helper:
```typescript
export function requireMcpAuth(): string {
  const ctx = mcpRequestContext.getStore();
  if (!ctx?.apiKeyHash) {
    throw new McpAuthError("Authentication required");
  }
  return ctx.apiKeyHash;
}
```

### Audit Log Helper

**File: `src/app/api/mcp/audit.ts`** (new file)

```typescript
export async function logMcpAudit(entry: {
  artistId: string;
  field: string;
  action: "set" | "delete";
  submittedUrl?: string;
  oldValue?: string | null;
  newValue?: string | null;
  apiKeyHash: string;
}): Promise<void>
```

Simple insert into `mcp_audit_log`.

### Tests (TDD)

**File: `src/app/api/mcp/__tests__/set-artist-link.test.ts`** (new file)

| # | Test case |
|---|-----------|
| 1 | Returns error when artist ID does not exist |
| 2 | Returns error when URL does not match any platform |
| 3 | Sets instagram link for artist — calls `setArtistLink` with correct args |
| 4 | Sets wikipedia link — validates against urlmap regex |
| 5 | Returns old value when overwriting existing link |
| 6 | Writes audit log entry with correct fields |
| 7 | Returns error when no auth context (unauthenticated) |

**File: `src/app/api/mcp/__tests__/delete-artist-link.test.ts`** (new file)

| # | Test case |
|---|-----------|
| 1 | Returns error when artist ID does not exist |
| 2 | Returns error when siteName is not in urlmap |
| 3 | Returns error when link is already null |
| 4 | Deletes x link — calls `clearArtistLink` with correct args |
| 5 | Returns old value in response |
| 6 | Writes audit log entry with correct fields |
| 7 | Returns error when no auth context (unauthenticated) |

**File: `src/app/api/mcp/__tests__/audit.test.ts`** (new file)

| # | Test case |
|---|-----------|
| 1 | Inserts audit log row with all fields |
| 2 | Handles nullable fields (submittedUrl, oldValue, newValue) |

**File: `src/app/api/mcp/__tests__/request-context.test.ts`** (new file)

| # | Test case |
|---|-----------|
| 1 | `requireMcpAuth` returns apiKeyHash when context is set |
| 2 | `requireMcpAuth` throws when context is not set |

### Acceptance Tests

All automated. Run: `npm run test`

| # | Test | Validates |
|---|------|-----------|
| AT-1 | `set-artist-link.test.ts` — all 7 cases green | set tool works |
| AT-2 | `delete-artist-link.test.ts` — all 7 cases green | delete tool works |
| AT-3 | `audit.test.ts` — all 2 cases green | Audit logging works |
| AT-4 | `request-context.test.ts` — all 2 cases green | Auth context threading works |
| AT-5 | `transformers.test.ts` — existing MCP tests pass | No regression on read-only tools |
| AT-6 | Full test suite: `npm run test` | Full regression |
| AT-7 | CI gate: `npm run type-check && npm run lint && npm run test && npm run build` | Full CI |

---

## Phase 4: Integration and Final Validation

**Branch:** `feature/mcp-artist-link-tools` (the long-lived feature branch)
**PR target:** `main`
**Depends on:** All previous phases merged into the feature branch

### Changes

1. **Wire auth into `route.ts`** — wrap POST handler with `mcpRequestContext.run()` if Authorization header is present.
2. **Update `CLAUDE.md`** — document new MCP tools, new env vars (if any), new tables.
3. **Verify all read-only tools still work without auth** (backward compatibility).

### Acceptance Tests

| # | Test | Type | Validates |
|---|------|------|-----------|
| AT-1 | CI gate: `npm run type-check && npm run lint && npm run test && npm run build` | Automated | Full CI |
| AT-2 | Start dev server, call `search_artists` via MCP without auth header — succeeds | **Manual** | Backward compat |
| AT-3 | Call `set_artist_link` without auth header — returns auth error | **Manual** | Auth enforcement |
| AT-4 | Insert a test API key into `mcp_api_keys`, call `set_artist_link` with valid Bearer token — succeeds | **Manual** | End-to-end set flow |
| AT-5 | Call `delete_artist_link` with valid Bearer token — succeeds | **Manual** | End-to-end delete flow |
| AT-6 | Verify `mcp_audit_log` has entries for AT-4 and AT-5 | **Manual** | Audit trail |
| AT-7 | Call `set_artist_link` with a revoked key — returns auth error | **Manual** | Key revocation |

---

## Summary

| Phase | Description | Depends on | Parallelizable with |
|-------|-------------|------------|---------------------|
| 1A | Refactor `extractArtistId` return values | — | 1B |
| 1B | Add `mcp_api_keys` + `mcp_audit_log` schema | — | 1A |
| 2A | Extract `setArtistLink` / `clearArtistLink` | 1A | 2B |
| 2B | MCP auth helper | 1B | 2A |
| 3 | MCP tools + audit + request context | 2A, 2B | — |
| 4 | Integration wiring + final validation | 3 | — |

### Files Created

| File | Phase |
|------|-------|
| `src/server/utils/queries/artistLinkService.ts` | 2A |
| `src/server/utils/queries/__tests__/artistLinkService.test.ts` | 2A |
| `src/app/api/mcp/auth.ts` | 2B |
| `src/app/api/mcp/__tests__/auth.test.ts` | 2B |
| `src/app/api/mcp/request-context.ts` | 3 |
| `src/app/api/mcp/audit.ts` | 3 |
| `src/app/api/mcp/__tests__/set-artist-link.test.ts` | 3 |
| `src/app/api/mcp/__tests__/delete-artist-link.test.ts` | 3 |
| `src/app/api/mcp/__tests__/audit.test.ts` | 3 |
| `src/app/api/mcp/__tests__/request-context.test.ts` | 3 |

### Files Modified

| File | Phase | Change |
|------|-------|--------|
| `src/server/utils/services.ts` | 1A | YouTube returns storage-ready values (no `@`) |
| `src/server/utils/__tests__/services.test.ts` | 1A | Update YouTube test expectations |
| `src/server/db/schema.ts` | 1B | Add two new tables |
| `src/server/utils/queries/artistQueries.ts` | 2A | Slim down `approveUGC()` and `removeArtistData()` |
| `src/app/api/mcp/server.ts` | 3 | Register `set_artist_link` and `delete_artist_link` |
| `src/app/api/mcp/route.ts` | 3, 4 | Thread auth context via AsyncLocalStorage |
| `CLAUDE.md` | 4 | Document new tools and tables |
