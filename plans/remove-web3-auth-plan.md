# Remove Web3 Authentication - Read-Only Conversion Plan

## Overview
Convert MusicNerdWeb from Web3-authenticated platform to read-only website. All editing and admin functionality will be disabled until a new authentication system is implemented.

**Decision Summary:**
- Protected pages: Show 401 Unauthorized
- API routes: Return 401 Unauthorized
- Dependencies: Remove completely
- Navigation UI: Remove completely

---

## Phase 1: Create Unauthorized Components

### 1.1 Create Reusable 401 Page Component
**File:** `src/app/_components/UnauthorizedPage.tsx` (NEW)

Create a simple component to display for all protected pages:
```tsx
export default function UnauthorizedPage() {
  return (
    <div className="container mx-auto py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">401 Unauthorized</h1>
      <p className="text-gray-600 mb-8">
        Authentication is currently disabled. Please check back later.
      </p>
      <a href="/" className="text-blue-600 hover:underline">
        Return to Home
      </a>
    </div>
  );
}
```

### 1.2 Create API Error Response Utility
**File:** `src/lib/apiErrors.ts` (NEW)

```typescript
import { NextResponse } from 'next/server';

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Authentication temporarily disabled' },
    { status: 401 }
  );
}
```

---

## Phase 2: Update Protected Pages (Show 401)

Replace authentication checks with UnauthorizedPage component:

### 2.1 Admin Dashboard
**File:** `src/app/admin/page.tsx`
- Remove `getServerAuthSession()` call
- Remove user role checks
- Return `<UnauthorizedPage />` directly

### 2.2 User Profile
**Files:**
- `src/app/profile/page.tsx` - Return UnauthorizedPage
- `src/app/profile/ClientWrapper.tsx` - Can be simplified or removed
- `src/app/profile/Dashboard.tsx` - Won't be rendered
- `src/app/profile/Wrapper.tsx` - Won't be rendered

### 2.3 Add Artist Page
**Files:**
- `src/app/add-artist/page.tsx` - Return UnauthorizedPage
- `src/app/add-artist/_components/AddArtistContent.tsx` - Won't be rendered

### 2.4 Artist Detail Page (Partial)
**File:** `src/app/artist/[id]/page.tsx`
- Keep page accessible (read-only view)
- Remove session fetching: `const session = await getServerAuthSession()`
- Pass `null` or undefined for session to child components
- Remove `ClientSessionWrapper` usage

**Files to update:**
- `src/app/artist/[id]/_components/ClientSessionWrapper.tsx` - Remove (no longer needed)
- `src/app/artist/[id]/_components/SessionDependentButtons.tsx` - Remove or hide all buttons
- `src/app/artist/[id]/_components/AddArtistData.tsx` - Remove or disable completely

---

## Phase 3: Update API Routes (Return 401)

All protected API routes should return 401 immediately:

### 3.1 Admin API Routes
**Files:**
- `src/app/api/admin/whitelist-user/[id]/route.ts` - Return 401
- `src/app/api/pendingUGCCount/route.ts` - Return 401

### 3.2 User Data API Routes
**Files:**
- `src/app/api/approvedUGCCount/route.ts` - Return 401
- `src/app/api/ugcCount/route.ts` - Return 401
- `src/app/api/user/[id]/route.ts` - Return 401 or make read-only
- `src/app/api/userEntries/route.ts` - Return 401

### 3.3 Data Modification API Routes
**Files:**
- `src/app/api/removeArtistData/route.ts` - Return 401
- `src/app/api/recentEdited/route.ts` - Return 401 or make read-only

### 3.4 Auth API Routes
**Files:**
- `src/app/api/auth/[...nextauth]/route.ts` - DELETE (entire NextAuth endpoint)
- `src/app/api/auth/[...nextauth]/auth.ts` - DELETE

**Pattern for each route:**
```typescript
import { unauthorizedResponse } from '@/lib/apiErrors';

export async function GET() {
  return unauthorizedResponse();
}

export async function POST() {
  return unauthorizedResponse();
}

export async function PUT() {
  return unauthorizedResponse();
}

export async function DELETE() {
  return unauthorizedResponse();
}
```

---

## Phase 4: Update Server Actions

### 4.1 Add Artist Action
**File:** `src/app/actions/addArtist.ts`
- Remove authentication check
- Return error immediately: `{ success: false, error: 'Authentication disabled' }`

---

## Phase 5: Remove Navigation UI

### 5.1 Remove Login Component
**File:** `src/app/_components/nav/components/Login.tsx`
- DELETE entirely

### 5.2 Update Main Navigation
**File:** `src/app/_components/nav/index.tsx`
- Remove `<Login />` import and usage
- Remove profile dropdown if present
- Remove any session-dependent UI elements
- Keep only read-only navigation (search, browse, etc.)

### 5.3 Remove Add Artist Dialog from Nav
**File:** `src/app/_components/nav/components/AddArtist.tsx`
- DELETE or remove from navigation bar
- This component uses `useConnectModal` from RainbowKit

---

## Phase 6: Remove Provider Components

### 6.1 Remove LoginProviders
**File:** `src/app/_components/nav/components/LoginProviders.tsx`
- DELETE entirely (contains RainbowKit + Wagmi providers)

### 6.2 Update Root Providers
**File:** `src/app/_components/Providers.tsx`
- Remove `SessionProvider` wrapper
- Keep only `ThemeProvider` if present
- Remove any session-related context

### 6.3 Update Root Layout
**File:** `src/app/layout.tsx`
- Remove `LoginProviders` wrapper
- Update Providers component usage
- Clean up any Web3-specific metadata

---

## Phase 7: Remove/Disable Session-Dependent Components

### 7.1 Remove Auth Toast
**File:** `src/app/_components/AuthToast.tsx`
- DELETE (shows notifications on login/logout)

### 7.2 Remove Auto Refresh
**File:** `src/app/_components/AutoRefresh.tsx`
- DELETE (refreshes page on auth state change)

### 7.3 Update Edit Mode Context
**File:** `src/app/_components/EditModeContext.tsx`
- Set edit mode to always `false`
- Remove admin session checks
- Make it a no-op provider

### 7.4 Disable Editable Components
**Files:**
- `src/app/_components/EditablePlatformLink.tsx` - Make read-only always
- `src/app/_components/EditModeToggle.tsx` - DELETE or hide
- `src/app/_components/ArtistLinks.tsx` - Remove session prop, always read-only

---

## Phase 8: Remove Core Auth Files

### 8.1 NextAuth Configuration
**Files to DELETE:**
- `src/server/auth.ts` - Main NextAuth config
- `src/lib/authAdapter.tsx` - RainbowKit SIWE adapter

### 8.2 Remove Custom Hooks
**Files to DELETE:**
- `src/hooks/useSessionSync.ts` - Auto-refresh session from DB
- `src/hooks/useEnsAvatar.ts` - Uses Wagmi/Viem

---

## Phase 9: Keep Admin Components

**Decision: KEEP all admin component files**

All files in `src/app/admin/` will remain (they won't be accessible since admin page returns 401):
- `UserSearch.tsx`
- `UsersSection.tsx`
- `WhitelistUserEditDialog.tsx`
- `columns.tsx`
- `data-table.tsx`
- `ugc-data-table.tsx`
- `whitelisted-data-table.tsx`

**Rationale:**
- Won't increase bundle size (Next.js won't include them if parent page isn't rendered)
- Easy to restore when new auth is added
- No risk of accidentally breaking something
- Isolated and harmless

---

## Phase 10: Update Database Query Functions

### 10.1 User Queries
**File:** `src/server/utils/queries/userQueries.ts`
- Keep read-only functions (getUserById, getUserByWallet)
- Keep or comment out write functions for future use
- Functions like `createUser`, `updateUser` can stay (just unused)

### 10.2 Artist Queries
**File:** `src/server/utils/queries/artistQueries.ts`
- Keep read-only queries
- Keep write queries (just won't be called)

### 10.3 Leaderboard Queries
**File:** `src/server/utils/queries/leaderboardQueries.ts`
- Keep as-is (may still be useful for public leaderboard view)

---

## Phase 11: Remove Dependencies

### 11.1 Uninstall npm packages
```bash
npm uninstall next-auth
npm uninstall @rainbow-me/rainbowkit
npm uninstall @rainbow-me/rainbowkit-siwe-next-auth
npm uninstall wagmi
npm uninstall siwe
npm uninstall viem
npm uninstall ethers
npm uninstall react-jazzicon
```

### 11.2 Verify package.json
- Check that all Web3 packages are removed
- Review `dependencies` and `devDependencies` sections

---

## Phase 12: Update Environment Configuration

### 12.1 Environment Variables
**File:** `src/env.ts`
- Remove NEXTAUTH_URL validation
- Remove NEXTAUTH_SECRET validation
- Remove NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT
- Remove PRIVY_APP_ID / PRIVY_APP_SECRET if present

### 12.2 .env.local / .env
**Remove these variables:**
```env
NEXTAUTH_URL=...
NEXTAUTH_SECRET=...
NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT=...
```

---

## Phase 13: Update Tests

### 13.1 Delete Auth-Specific Tests
**Files to DELETE:**
- `src/server/utils/__tests__/auth.test.ts`
- `src/server/utils/__tests__/web3-auth.test.ts`
- `src/lib/__tests__/authAdapter.test.tsx`
- `src/__tests__/loginFlow.test.tsx`
- `src/__tests__/components/Login.render.test.tsx`
- `src/__tests__/auth/protected-routes.test.tsx`
- `src/app/profile/__tests__/page.test.tsx`

### 13.2 Delete Test Mocks
**Files to DELETE:**
- `src/test/__mocks__/next-auth.ts`
- `src/server/utils/__tests__/__mocks__/mockAuth.ts`

### 13.3 Update Remaining Tests
**Files to update:**
- `src/app/actions/__tests__/addArtist.test.ts` - Update to expect failure
- `src/app/api/findArtistBySpotifyID/__tests__/route.test.ts` - Remove auth mocks
- `src/app/api/leaderboard/__tests__/route.test.ts` - Remove auth mocks
- Any other tests that mock `getServerAuthSession` or `useSession`

---

## Phase 14: Update TypeScript Types

### 14.1 Session Types
**Files to check:**
- Remove or update `Session` type imports from `next-auth`
- Update any custom session type definitions
- Remove wallet-specific types

### 14.2 User Types
**Consider keeping:**
- Database user types (for future auth system)
- Can keep role flags in database for now

---

## Phase 15: Final Cleanup & Verification

### 15.1 Type Checking
```bash
npm run type-check
```
- Fix any TypeScript errors related to removed auth code
- Remove unused imports
- Fix broken type references

### 15.2 Linting
```bash
npm run lint
```
- Clean up ESLint warnings
- Remove unused variables
- Fix import errors

### 15.3 Build Test
```bash
npm run build
```
- Ensure production build succeeds
- Check for any build-time errors
- Verify bundle size reduction

### 15.4 Run Tests
```bash
npm run test
```
- Fix or remove failing tests
- Ensure all remaining tests pass
- Update test coverage thresholds if needed

---

## Database Considerations

### Current User Table Schema
The `users` table has Web3-specific fields:
- `wallet` (text, unique) - Ethereum wallet address
- `isAdmin` (boolean) - Admin role
- `isWhiteListed` (boolean) - Whitelist role
- `isSuperAdmin` (boolean) - Super admin role

**Recommendation for this phase:**
- **DO NOT** modify database schema yet
- Keep all fields for future auth system
- Fields will be repurposed when new auth is added
- Consider `wallet` → `email`, keep role flags as-is

---

## Rollback Plan

If you need to restore Web3 auth:

1. **Git revert** the branch
2. **Reinstall dependencies:** `npm install`
3. **Restore environment variables** from backup
4. **Run database migrations** if any schema changes were made

---

## Testing Checklist (Post-Implementation)

### Manual Testing
- [ ] Homepage loads without errors
- [ ] Search functionality still works
- [ ] Artist pages load in read-only mode
- [ ] Clicking "Add Artist" shows 401 (or removed)
- [ ] `/admin` shows 401 Unauthorized page
- [ ] `/profile` shows 401 Unauthorized page
- [ ] `/add-artist` shows 401 Unauthorized page
- [ ] Login button is removed from navigation
- [ ] No console errors related to providers/hooks
- [ ] API routes return 401 when tested directly

### Technical Validation
- [ ] No RainbowKit/Wagmi imports in code
- [ ] No NextAuth imports in code
- [ ] `next-auth` not in package.json
- [ ] Bundle size reduced (check build output)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Remaining tests pass (`npm run test`)

---

## Estimated Impact

### Files to DELETE: ~25-30 files
- Core auth files: 4
- Test files: 9
- Component files: 10+
- Mock files: 2

### Files to MODIFY: ~30-40 files
- Protected pages: 6
- API routes: 10
- Navigation components: 3
- Provider components: 3
- Context/utility files: 8

### npm packages to REMOVE: 8 packages
- Bundle size reduction: Estimated 500KB+ (RainbowKit, Wagmi, Viem, etc.)

### Expected LOC Reduction: ~3,000-5,000 lines
- Auth configuration: ~500 lines
- Test files: ~1,500 lines
- Component files: ~1,000 lines
- Provider/adapter files: ~800 lines

---

## Implementation Order (Recommended)

To avoid breaking changes during implementation:

1. **Phase 1** - Create UnauthorizedPage component ✅
2. **Phase 2** - Update protected pages (show 401) ✅
3. **Phase 3** - Update API routes (return 401) ✅
4. **Phase 5** - Remove navigation UI (login button, etc.) ✅
5. **Phase 7** - Disable session-dependent components ✅
6. **Phase 4** - Update server actions ✅
7. **Phase 6** - Remove provider components ✅
8. **Phase 8** - Remove core auth files ✅
9. **Phase 13** - Update/delete tests ✅
10. **Phase 11** - Uninstall dependencies ✅
11. **Phase 12** - Clean up environment config ✅
12. **Phase 15** - Final verification ✅

This order minimizes cascading errors and allows for incremental testing.

---

## Future Considerations

When implementing new authentication:

### 1. Reuse Existing Infrastructure
- Database schema (repurpose `wallet` field for email/username)
- Role-based access control (isAdmin, isWhiteListed)
- Protected route patterns
- API route authorization patterns

### 2. Potential Auth Systems
- **NextAuth with Email/Password** (easiest migration)
- **Clerk** (modern, feature-rich)
- **Supabase Auth** (if using Supabase)
- **Auth0** (enterprise option)
- **Custom JWT solution**

### 3. Migration Path
- Add new auth alongside placeholder components
- Migrate users from `wallet` to email-based identity
- Restore protected pages with new auth checks
- Restore API route authorization
- Gradually re-enable features

---

## Questions & Decisions Log

**Q: What happens to existing user data?**
A: Keep all user records in database. When new auth is added, users can re-register and admin can link old contributions.

**Q: Should we keep the database schema?**
A: Yes - don't modify schema. Role flags (isAdmin, isWhiteListed) will be reused.

**Q: What about SEO/public pages?**
A: Artist pages, search, and browse functionality remain fully accessible (read-only).

**Q: Can we restore features later?**
A: Yes - Git history preserves all auth code. New auth system can reuse patterns.

---

**Plan Status:** ✅ Ready for Implementation
**Last Updated:** 2025-12-23
**Created By:** Claude (Sonnet 4.5)
