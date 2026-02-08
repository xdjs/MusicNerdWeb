# Plan: Re-implement Server-Side Auth Checks

## Context

When the project migrated from Web3/SIWE to Privy email-first auth (commit `c0783e1`), all server-side auth checks were disabled — 8 API routes were gutted to return `unauthorizedResponse()` ("Authentication temporarily disabled"). The `artistBio` PUT handler was left without any route-level auth check. This plan restores proper auth to all protected routes using the now-functional Privy + NextAuth session system. It also removes the obsolete `walletlessEnabled` dev bypass throughout the codebase.

## Architecture

**4 phases** — Phase 0 (common) must complete first; Phases 1–3 are independent and can run in parallel.

All unit tests use the **Jest 30 canonical pattern**: `jest.resetModules()` in `beforeEach` + dynamic `await import()` in a `setup()` helper. See `src/app/api/auth/link-wallet/__tests__/route.test.ts` as reference.

---

## Phase 0: Common Code

### 0A. Playwright setup

Add `@playwright/test` dev dependency. Create `playwright.config.ts` with configurable `BASE_URL` (defaults to `http://localhost:3000`, overridable via `BASE_URL` env var for staging/production).

Create shared login helper `e2e/helpers/auth.ts`:
- `login(page, email, otp)` — navigates to app, clicks login, enters email + OTP via Privy modal, waits for authenticated state
- `fetchAsUser(page, url, init?)` — makes an API request using the browser's authenticated session cookies

**Test credentials:**
| Role | Email | OTP |
|------|-------|-----|
| Regular user | test-4473@privy.io | 676856 |
| Whitelisted user | test-4132@privy.io | 202849 |
| Admin user | test-3256@privy.io | 207862 |

### 0B. Auth helper functions

**Create `src/lib/auth-helpers.ts`** with two helpers that encapsulate the repeated auth pattern:

```typescript
requireAuth() → { session, userId } | NextResponse(401)
requireAdmin() → { session, userId } | NextResponse(403)
```

- `requireAuth()` calls `getServerAuthSession()`, returns 401 if no `session.user.id`
- `requireAdmin()` calls `requireAuth()`, then `getUserById()`, returns 403 if `!dbUser.isAdmin`
- Both return a discriminated union: `{ authenticated: true, session, userId }` or `{ authenticated: false, response }`

**Reuses:**
- `getServerAuthSession()` from `src/server/auth.ts`
- `getUserById()` from `src/server/utils/queries/userQueries.ts:21`

**Tests: `src/lib/__tests__/auth-helpers.test.ts`**
- `requireAuth` returns 401 when session is null
- `requireAuth` returns 401 when session.user.id is missing
- `requireAuth` returns session + userId on valid session
- `requireAdmin` returns 401 when not authenticated
- `requireAdmin` returns 403 when user is not admin
- `requireAdmin` returns session + userId when user is admin

### 0C. Remove walletless dev bypass

Remove all `NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT` / `walletlessEnabled` code. This bypass was needed when wallet auth was required; Privy email auth makes it obsolete.

**Files to modify (remove bypass logic):**

| File | What to remove |
|------|---------------|
| `src/app/_components/nav/components/Login.tsx:39-42` | `walletlessEnabled` check + fallback rendering |
| `src/app/_components/PleaseLoginPage.tsx:6` | `isWalletRequired` check |
| `src/server/utils/queries/artistQueries.ts` | 6 bypass checks (lines 319, 403-405, 504, 517, 629-638, 678-697) |
| `src/server/utils/queries/userQueries.ts:63-65, 199-201` | 2 bypass checks |
| `src/server/utils/queries/leaderboardQueries.ts:147-152` | 1 bypass check |
| `src/app/api/leaderboard/route.ts:11-14` | walletless comment + check |
| `src/server/utils/__tests__/removeArtistData.test.ts:55-76` | Walletless-specific test cases |
| `src/__tests__/setup.ts:12` | `NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT` env var |

**For each bypass removal:** Replace the `if (!walletlessEnabled)` guard with the direct auth check (i.e., always require auth, no bypass). Where the function receives a session parameter, just check `if (!session)` without the walletless fallback.

### 0D. Clean up `src/lib/apiErrors.ts`

Delete `unauthorizedResponse()` after all route stubs are replaced.

---

## Phase 1: Admin Routes

### 1A. `PUT /api/admin/whitelist-user/[id]`

**File:** `src/app/api/admin/whitelist-user/[id]/route.ts`

Restore from git (`c0783e1^`). Auth logic:
- `requireAdmin()` for role changes (`isAdmin`, `isWhiteListed`, `isHidden`)
- Calls `updateWhitelistedUser(id, { wallet, email, username, isAdmin, isWhiteListed, isHidden })`
- Returns 200/400/401/403/500

**Tests: `src/app/api/admin/whitelist-user/[id]/__tests__/route.test.ts`**
- Returns 401 when not authenticated
- Returns 403 when non-admin tries to update roles
- Returns 200 on successful update
- Returns 400 when `updateWhitelistedUser` returns error status
- Returns 500 on unexpected error

### 1B. `PUT /api/artistBio/[id]` — add route-level auth

**File:** `src/app/api/artistBio/[id]/route.ts`

The PUT handler currently has **no auth check** — anyone can modify bios. Add `requireAdmin()` at the top of the PUT handler. The GET handler stays public.

**Tests: `src/app/api/artistBio/[id]/__tests__/route.test.ts`**
- PUT returns 401 when not authenticated
- PUT returns 403 when non-admin
- PUT returns 200 for admin with valid bio
- PUT returns 400 for invalid bio (empty, non-string)
- GET remains public (no auth check — existing behavior)

### 1C. Acceptance tests (`e2e/admin-auth.spec.ts`)
- Admin can update user whitelist status via PUT `/api/admin/whitelist-user/[id]`
- Admin can update artist bio via PUT `/api/artistBio/[id]`
- Regular user gets 403 on admin operations
- Unauthenticated request gets 401 on admin operations

**Phase 1 is complete when all unit tests + `npx playwright test e2e/admin-auth.spec.ts` pass.**

---

## Phase 2: UGC Routes

### 2A. `GET /api/ugcCount`

**File:** `src/app/api/ugcCount/route.ts`

Restore from git. Auth logic (soft-fail pattern):
- `getServerAuthSession()` — returns `{ count: 0 }` if no session (not 401)
- Counts all UGC entries for `session.user.id`
- Direct Drizzle query: `db.query.ugcresearch.findMany({ where: eq(ugcresearch.userId, userId) })`

**Tests: `src/app/api/ugcCount/__tests__/route.test.ts`**
- Returns `{ count: 0 }` when not authenticated
- Returns correct count for authenticated user with entries
- Returns `{ count: 0 }` for user with no entries
- Returns `{ count: 0 }` on error (status 500)

### 2B. `GET /api/pendingUGCCount`

**File:** `src/app/api/pendingUGCCount/route.ts`

Restore from git. Auth logic (soft-fail + admin gate):
- Returns `{ count: 0 }` if not authenticated
- Returns `{ count: 0 }` if authenticated but not admin
- Only admins get the real count via `getPendingUGC()`

**Tests: `src/app/api/pendingUGCCount/__tests__/route.test.ts`**
- Returns `{ count: 0 }` when not authenticated
- Returns `{ count: 0 }` for non-admin user
- Returns correct count for admin user
- Returns `{ count: 0 }` on error

### 2C. `GET /api/approvedUGCCount`

**File:** `src/app/api/approvedUGCCount/route.ts`

Restore from git. Auth logic (soft-fail):
- Returns `{ count: 0 }` if not authenticated
- Counts approved UGC entries for current user: `where: and(eq(userId), eq(accepted, true))`

**Tests: `src/app/api/approvedUGCCount/__tests__/route.test.ts`**
- Returns `{ count: 0 }` when not authenticated
- Returns correct count for authenticated user
- Returns `{ count: 0 }` on error

### 2D. `POST /api/removeArtistData`

**File:** `src/app/api/removeArtistData/route.ts`

Restore from git **without** walletless bypass. Auth logic:
- `requireAuth()` — returns 401 if not authenticated
- Validates `{ artistId, siteName }` body — returns 400 if missing
- Calls `removeArtistData(artistId, siteName)`
- Remove the `"use server"` directive (this is a route handler, not a server action)

**Tests: `src/app/api/removeArtistData/__tests__/route.test.ts`**
- Returns 401 when not authenticated
- Returns 400 when `artistId` or `siteName` missing
- Returns 200 on successful removal
- Returns 403 when business logic fails
- Returns 500 on unexpected error

### 2E. Acceptance tests (`e2e/ugc-auth.spec.ts`)
- Authenticated user sees their UGC count
- Admin sees pending UGC count (non-zero if pending entries exist)
- Regular user gets `{ count: 0 }` for pending UGC count
- Authenticated user can call removeArtistData endpoint
- Unauthenticated request gets 401 on removeArtistData

**Phase 2 is complete when all unit tests + `npx playwright test e2e/ugc-auth.spec.ts` pass.**

---

## Phase 3: User Routes

### 3A. `GET /api/user/[id]`

**File:** `src/app/api/user/[id]/route.ts`

Restore from git. Auth logic:
- `requireAuth()` — returns 401 if not authenticated
- Returns 401 if `session.user.id !== id` (can only fetch own data)
- Calls `getUserById(id)` — returns 404 if not found

**Tests: `src/app/api/user/[id]/__tests__/route.test.ts`**
- Returns 401 when not authenticated
- Returns 401 when requesting another user's data
- Returns 200 with user data when requesting own data
- Returns 404 when user not found
- Returns 500 on unexpected error

### 3B. `GET /api/userEntries`

**File:** `src/app/api/userEntries/route.ts`

Restore from git **without** walletless bypass. Auth logic:
- `getServerAuthSession()` — returns `{ entries: [], total: 0, pageCount: 0 }` if no session
- Query params: `page`, `siteName`, `all`
- Paginated Drizzle query joining `ugcresearch` + `artists`

**Tests: `src/app/api/userEntries/__tests__/route.test.ts`**
- Returns empty result when not authenticated
- Returns paginated entries for authenticated user
- Filters by `siteName` when provided
- Returns all entries when `all=true`
- Returns 500 on error

### 3C. `GET /api/recentEdited`

**File:** `src/app/api/recentEdited/route.ts`

Restore from git **without** walletless bypass. Auth logic:
- If `userId` query param is provided, use it directly (public lookup)
- Otherwise, `getServerAuthSession()` — returns `[]` if no session
- Fetches last 20 approved edits, dedupes by `artistId`, returns top 3
- Enriches with Spotify images via `getSpotifyImage()`

**Tests: `src/app/api/recentEdited/__tests__/route.test.ts`**
- Returns `[]` when not authenticated and no `userId` param
- Returns enriched entries for authenticated user
- Uses `userId` query param when provided (bypasses session)
- Deduplicates by artistId, limits to 3
- Returns `[]` on error

### 3D. Acceptance tests (`e2e/user-auth.spec.ts`)
- Authenticated user can fetch their own profile via GET `/api/user/[id]`
- Authenticated user can fetch their entries via GET `/api/userEntries`
- Authenticated user can fetch recent edits via GET `/api/recentEdited`
- Unauthenticated request gets empty/401 on protected user routes

**Phase 3 is complete when all unit tests + `npx playwright test e2e/user-auth.spec.ts` pass.**

---

## Files Summary

### New files
| File | Phase | Purpose |
|------|-------|---------|
| `playwright.config.ts` | 0 | Playwright config with configurable `BASE_URL` |
| `e2e/helpers/auth.ts` | 0 | Shared `login()` and `fetchAsUser()` helpers |
| `src/lib/auth-helpers.ts` | 0 | `requireAuth()` and `requireAdmin()` helpers |
| `src/lib/__tests__/auth-helpers.test.ts` | 0 | Unit tests for auth helpers |
| `src/app/api/admin/whitelist-user/[id]/__tests__/route.test.ts` | 1 | Admin route unit tests |
| `src/app/api/artistBio/[id]/__tests__/route.test.ts` | 1 | Artist bio PUT auth unit tests |
| `e2e/admin-auth.spec.ts` | 1 | Playwright admin acceptance tests |
| `src/app/api/ugcCount/__tests__/route.test.ts` | 2 | UGC count unit tests |
| `src/app/api/pendingUGCCount/__tests__/route.test.ts` | 2 | Pending UGC count unit tests |
| `src/app/api/approvedUGCCount/__tests__/route.test.ts` | 2 | Approved UGC count unit tests |
| `src/app/api/removeArtistData/__tests__/route.test.ts` | 2 | Remove artist data unit tests |
| `e2e/ugc-auth.spec.ts` | 2 | Playwright UGC acceptance tests |
| `src/app/api/user/[id]/__tests__/route.test.ts` | 3 | User profile unit tests |
| `src/app/api/userEntries/__tests__/route.test.ts` | 3 | User entries unit tests |
| `src/app/api/recentEdited/__tests__/route.test.ts` | 3 | Recent edited unit tests |
| `e2e/user-auth.spec.ts` | 3 | Playwright user acceptance tests |

### Modified files
| File | Change |
|------|--------|
| `src/app/api/admin/whitelist-user/[id]/route.ts` | Restore with `requireAdmin()` |
| `src/app/api/artistBio/[id]/route.ts` | Add `requireAdmin()` to PUT handler |
| `src/app/api/ugcCount/route.ts` | Restore with session-based auth |
| `src/app/api/pendingUGCCount/route.ts` | Restore with admin gate |
| `src/app/api/approvedUGCCount/route.ts` | Restore with session-based auth |
| `src/app/api/removeArtistData/route.ts` | Restore with `requireAuth()`, remove `"use server"` |
| `src/app/api/user/[id]/route.ts` | Restore with own-data auth check |
| `src/app/api/userEntries/route.ts` | Restore without walletless bypass |
| `src/app/api/recentEdited/route.ts` | Restore without walletless bypass |
| `src/app/api/leaderboard/route.ts` | Remove walletless comments/check |
| `src/server/utils/queries/artistQueries.ts` | Remove 6 walletless bypasses |
| `src/server/utils/queries/userQueries.ts` | Remove 2 walletless bypasses |
| `src/server/utils/queries/leaderboardQueries.ts` | Remove 1 walletless bypass |
| `src/app/_components/nav/components/Login.tsx` | Remove walletless fallback |
| `src/app/_components/PleaseLoginPage.tsx` | Remove `isWalletRequired` check |
| `src/server/utils/__tests__/removeArtistData.test.ts` | Remove walletless test cases |
| `src/__tests__/setup.ts` | Remove `NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT` |
| `src/lib/apiErrors.ts` | Delete `unauthorizedResponse()` |
| `package.json` | Add `@playwright/test` dev dependency |

### Configurable BASE_URL

Playwright tests target `BASE_URL` (env var, defaults to `http://localhost:3000`). This allows running against:
- **Local dev**: `npm run dev` then `npx playwright test`
- **Staging**: `BASE_URL=https://staging.example.com npx playwright test`

---

## Execution Order

```
Phase 0 (common) ─── must complete first
    │
    ├── Phase 1 (admin + e2e/admin-auth)   ─┐
    ├── Phase 2 (ugc + e2e/ugc-auth)       ─┤── independent, parallel
    └── Phase 3 (user + e2e/user-auth)     ─┘
```

## Phase Completion Criteria

A phase is **complete** when all of the following pass:
```bash
npm run type-check && npm run lint && npm run test && npm run build
npx playwright test e2e/<phase>-auth.spec.ts
```

All phases done:
```bash
npx playwright test  # runs all acceptance tests
```
