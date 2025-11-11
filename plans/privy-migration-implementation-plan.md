# Privy Migration Implementation Plan

## Overview
Migrate from NextAuth + RainbowKit + Wagmi + SIWE to Privy for authentication, enabling wallet + email login. Gradual rollout over 4-6 weeks with comprehensive testing at each phase.

## Migration Decisions Summary
- **Authentication methods**: Wallet + Email (social can be added later with 1-line config change)
- **Wagmi**: Fully remove (can re-add if on-chain operations needed later)
- **Role refresh**: 5-minute polling (matches current behavior)
- **User migration**: Automatic linking on first Privy login (zero data loss)
- **Deployment**: Immediate cutover (small user base)
- **Testing**: Both checklist-based and scenario-based acceptance tests

---

## **PHASE 1: Foundation & Setup** (Week 1)
**Goal**: Set up Privy infrastructure without breaking current system

### Tasks:

#### 1.1 Privy Account Setup
- Create Privy account at https://dashboard.privy.io
- Create staging app (for testing)
- Create production app (for deployment)
- Configure both apps:
  - Enable login methods: Wallet + Email
  - Set callback URLs (staging & production domains)
  - Configure appearance (logo, colors, theme)

#### 1.2 Install Dependencies
```bash
npm install @privy-io/react-auth @privy-io/server-auth
# Keep viem for now (used by Privy internally)
```

#### 1.3 Environment Variables
Add to `.env.local`, staging, and production:
```bash
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your-staging-app-id
PRIVY_APP_SECRET=your-staging-app-secret

# Production will use different values
```

#### 1.4 Database Migration - Add privy_user_id Column

**Current users table schema:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  email: text("email"),
  username: text("username"),
  wallet: text("wallet").notNull(),  // Currently NOT NULL
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  legacyId: text("legacy_id"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isWhiteListed: boolean("is_white_listed").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  acceptedUgcCount: bigint("accepted_ugc_count", { mode: "number" }),
});
```

**Step 1: Create migration file `drizzle/0011_add_privy_user_id.sql`:**
```sql
-- Add privy_user_id column (nullable for backward compatibility)
ALTER TABLE users ADD COLUMN privy_user_id TEXT;

-- Create index for fast lookups
CREATE INDEX idx_users_privy_id ON users(privy_user_id);

-- Make wallet column nullable (for email-only users)
ALTER TABLE users ALTER COLUMN wallet DROP NOT NULL;

-- Add unique constraint on privy_user_id (after migration completes)
-- We'll add this constraint later once all users have Privy IDs
```

**Step 2: Update Drizzle schema `/src/server/db/schema.ts`:**
```typescript
export const users = pgTable("users", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  privyUserId: text("privy_user_id").unique(),  // NEW: Privy user identifier
  email: text("email"),
  username: text("username"),
  wallet: text("wallet"),  // CHANGED: Now nullable (email-only users)
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  legacyId: text("legacy_id"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isWhiteListed: boolean("is_white_listed").default(false).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  acceptedUgcCount: bigint("accepted_ugc_count", { mode: "number" }),
},
(table) => {
  return {
    usersWalletKey: unique("users_wallet_key").on(table.wallet),
    // Note: privy_user_id unique constraint added in column definition
  }
});
```

**Step 3: Run migration:**
```bash
# Generate migration (if using drizzle-kit)
npm run db:generate

# Push to database
npm run db:push
```

#### 1.5 Update User Queries

Add to `/src/server/utils/queries/userQueries.ts`:

```typescript
// NEW: Get user by Privy ID
export async function getUserByPrivyId(privyUserId: string | undefined) {
  if (!privyUserId) return null;

  return await db.query.users.findFirst({
    where: eq(users.privyUserId, privyUserId)
  });
}

// KEEP: Get user by wallet (for migration)
export async function getUserByWallet(wallet: string | undefined) {
  if (!wallet) return null;

  return await db.query.users.findFirst({
    where: eq(users.wallet, wallet)
  });
}

// NEW: Link existing user to Privy ID
export async function linkUserToPrivy(userId: string, privyUserId: string) {
  return await db.update(users)
    .set({
      privyUserId,
      updatedAt: sql`(now() AT TIME ZONE 'utc'::text)`
    })
    .where(eq(users.id, userId))
    .returning();
}

// NEW: Create user with Privy ID
export async function createUserWithPrivy(data: {
  privyUserId: string;
  wallet?: string;
  email?: string;
  username?: string;
}) {
  return await db.insert(users)
    .values({
      privyUserId: data.privyUserId,
      wallet: data.wallet,
      email: data.email,
      username: data.username,
      isAdmin: false,
      isWhiteListed: false,
      isSuperAdmin: false,
      isHidden: false,
    })
    .returning();
}
```

#### 1.6 Create Privy Server Client

Create `/src/lib/privy-server.ts`:
```typescript
import { PrivyClient } from '@privy-io/server-auth';

if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
  throw new Error('Missing Privy environment variables');
}

export const privy = new PrivyClient(
  process.env.PRIVY_APP_ID,
  process.env.PRIVY_APP_SECRET
);

// Helper function for API routes
export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    throw new Error('No auth token provided');
  }

  try {
    const verifiedClaims = await privy.verifyAuthToken(token);
    return verifiedClaims;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
```

#### 1.7 Create Privy Config

Create `/src/lib/privy-config.ts`:
```typescript
export const privyConfig = {
  loginMethods: ['wallet', 'email'] as const,
  appearance: {
    theme: 'light' as const,
    accentColor: '#676FFF',
    logo: '/logo.png',
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
  },
};
```

### Automated Tests:
- Unit test: `privy-server.ts` exports valid PrivyClient
- Unit test: `getUserByPrivyId()` returns user when exists
- Unit test: `getUserByPrivyId()` returns null when not found
- Unit test: `getUserByWallet()` works with existing wallet
- Unit test: `linkUserToPrivy()` updates user record correctly
- Unit test: `createUserWithPrivy()` creates user with all fields
- Integration test: Can verify mock Privy tokens
- Migration test: Database accepts null wallet values

### Manual Acceptance Test:
✅ **Checklist:**
- [ ] Privy dashboard shows staging & production apps
- [ ] Environment variables set in `.env.local`
- [ ] Environment variables set in staging deployment
- [ ] Environment variables set in production deployment
- [ ] Migration file created: `drizzle/0011_add_privy_user_id.sql`
- [ ] Schema updated: `src/server/db/schema.ts` has `privyUserId` field
- [ ] Database migration runs without errors: `npm run db:push`
- [ ] TypeScript compiles: `npm run type-check`
- [ ] User queries file has all new functions

✅ **Test Scenarios:**

**Scenario 1: Verify Database Migration**
```bash
# Check column exists
psql $SUPABASE_DB_CONNECTION -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='privy_user_id';"
# Expected: privy_user_id | text | YES

# Check index exists
psql $SUPABASE_DB_CONNECTION -c "SELECT indexname FROM pg_indexes WHERE tablename='users' AND indexname='idx_users_privy_id';"
# Expected: idx_users_privy_id

# Verify wallet is now nullable
psql $SUPABASE_DB_CONNECTION -c "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='users' AND column_name='wallet';"
# Expected: wallet | YES

# Check existing data is intact
psql $SUPABASE_DB_CONNECTION -c "SELECT COUNT(*) as total_users, COUNT(wallet) as users_with_wallet, COUNT(privy_user_id) as users_with_privy_id FROM users;"
# Expected: total_users matches current count, users_with_wallet matches current count, users_with_privy_id = 0
```

**Scenario 2: Test User Query Functions**
```typescript
// Create test file: src/server/utils/queries/__tests__/userQueries.privy.test.ts
import { getUserByPrivyId, getUserByWallet, linkUserToPrivy, createUserWithPrivy } from '../userQueries';

describe('Privy User Queries', () => {
  test('getUserByPrivyId returns null for non-existent user', async () => {
    const user = await getUserByPrivyId('did:privy:fake123');
    expect(user).toBeNull();
  });

  test('createUserWithPrivy creates user with email only', async () => {
    const user = await createUserWithPrivy({
      privyUserId: 'did:privy:test123',
      email: 'test@example.com',
      // No wallet
    });
    expect(user.privyUserId).toBe('did:privy:test123');
    expect(user.email).toBe('test@example.com');
    expect(user.wallet).toBeNull();
  });
});
```

**Deliverable**: Infrastructure ready, database migrated, no user-facing changes yet

---

## Database Migration Details

### Why Make Wallet Nullable?

**Current System**: `wallet` is `NOT NULL` because all users must authenticate with a wallet.

**With Privy**: Users can authenticate with:
- **Wallet only** → `wallet` populated, `email` may be null
- **Email only** → `email` populated, `wallet` is null
- **Both** → Both fields populated

**Impact Analysis**:
```sql
-- Check if any code assumes wallet is always present
-- Search codebase for: users.wallet, user.wallet, session.user.wallet
```

### Migration Safety Checklist

- [x] New column is nullable (safe to add)
- [x] Existing wallet data preserved
- [x] Index added for performance
- [x] Schema type-safe (TypeScript will catch missing null checks)
- [x] Backward compatible (old code still works with wallet field)
- [x] Forward compatible (Privy users can have email or wallet)

### Rollback Plan for Database Changes

If migration fails or needs rollback:

```sql
-- Rollback migration (run only if needed)
DROP INDEX IF EXISTS idx_users_privy_id;
ALTER TABLE users DROP COLUMN IF EXISTS privy_user_id;
ALTER TABLE users ALTER COLUMN wallet SET NOT NULL;  -- Only if no email-only users created
```

**Note**: Cannot rollback wallet nullability if email-only users exist. Handle this by:
1. Delete email-only users (if any)
2. Then set wallet back to NOT NULL
3. Or keep wallet nullable (no harm if migration incomplete)

---

## **PHASE 2: Core Provider & Authentication UI** (Week 2)
**Goal**: Replace auth providers and login UI on staging

### Tasks:
1. Create `/src/hooks/useUserData.ts` (role fetching with 5-min polling)
2. Update `/src/app/_components/nav/components/LoginProviders.tsx` (replace with PrivyProvider)
3. Rewrite `/src/app/_components/nav/components/Login.tsx` (use `usePrivy()`)
4. Update `/src/app/_components/Providers.tsx` (remove SessionProvider)
5. Create `/src/app/api/user/me/route.ts` (user data endpoint with auto-linking)
6. Remove old dependencies: NextAuth, RainbowKit, SIWE, Wagmi

### Automated Tests:
- Unit test: `useUserData` hook fetches and caches user data
- Unit test: `useUserData` polls every 5 minutes
- Component test: Login button renders correctly
- Component test: Login modal opens on click
- Integration test: `/api/user/me` links existing users by wallet
- Mock test: Privy hooks return expected data

### Manual Acceptance Test:
✅ **Checklist:**
- [ ] Login button appears in navigation (logged out state)
- [ ] Clicking login opens Privy modal
- [ ] Privy modal shows "Connect Wallet" and "Email" options
- [ ] Can log in with test wallet (MetaMask, etc.)
- [ ] Can log in with test email
- [ ] User avatar/username displays after login
- [ ] Logout button works
- [ ] Session persists after page refresh

✅ **Test Scenarios:**
1. **New wallet user**: Log in with fresh wallet → User created in database
2. **Existing wallet user**: Log in with wallet from old system → User linked to Privy ID, roles preserved
3. **Email user**: Log in with email → New user created
4. **Cross-tab sync**: Log in on tab 1 → Tab 2 shows logged-in state

**Deliverable**: Working login/logout on staging, existing users auto-migrate

---

## **PHASE 3: Client Components Migration** (Week 3)
**Goal**: Update all client components using auth

### Tasks:
1. Replace `useSession()` with `usePrivy()` + `useUserData()` in:
   - `/src/app/profile/Dashboard.tsx`
   - `/src/app/profile/ClientWrapper.tsx`
   - `/src/app/_components/AuthToast.tsx`
   - `/src/app/_components/nav/components/SearchBar.tsx`
   - `/src/app/add-artist/_components/AddArtistContent.tsx`
   - All other client components (~10 more files)
2. Update loading states to check `ready` and `isLoading`
3. Update auth checks: `session?.user` → `authenticated && dbUser`
4. Update role checks: `session.user.isAdmin` → `dbUser?.isAdmin`
5. Remove all `next-auth/react` imports

### Automated Tests:
- Component test: Each component renders in logged-out state
- Component test: Each component renders in logged-in state
- Component test: Admin-only components check `dbUser.isAdmin`
- Component test: Loading states display correctly
- Snapshot test: UI matches previous implementation

### Manual Acceptance Test:
✅ **Checklist:**
- [ ] Profile page loads for logged-in users
- [ ] Profile page shows "Login required" for logged-out users
- [ ] Add Artist page requires authentication
- [ ] Search bar works for both logged-in and logged-out states
- [ ] Admin badge shows for admin users only
- [ ] Whitelist features visible to whitelisted users only

✅ **Test Scenarios:**
1. **As guest**: Visit `/add-artist` → Redirected to login
2. **As regular user**: Visit `/admin` → See "Unauthorized" message
3. **As admin**: Visit `/admin` → See admin dashboard
4. **Role change**: Admin demotes user → Within 5 min, user loses admin UI
5. **Loading state**: Slow connection → Spinner shows while loading user data

**Deliverable**: All client UI works with Privy auth on staging

---

## **PHASE 4: API Routes & Server Components** (Week 4)
**Goal**: Migrate all server-side auth checks

### Tasks:
1. Create `/src/lib/auth-helpers.ts` (helper functions for token verification)
2. Update 26 API routes to use Privy token verification:
   - Admin routes: `/api/admin/whitelist-user/[id]/route.ts`, etc.
   - UGC routes: `/api/approveUGC/route.ts`, etc.
   - User routes: `/api/userEntries/route.ts`, etc.
3. Update pattern: `getServerAuthSession()` → `getUserFromRequest(req)`
4. Update server components using auth (if any)
5. Remove `/src/server/auth.ts` (NextAuth config)
6. Remove `/src/app/api/auth/[...nextauth]/route.ts`
7. Delete `/src/lib/authAdapter.tsx`

### Automated Tests:
- Integration test: Protected routes return 401 without token
- Integration test: Protected routes return 403 for non-admin users
- Integration test: Protected routes work with valid token + admin role
- Integration test: Token verification handles expired tokens
- Integration test: All 26 API routes maintain existing behavior

### Manual Acceptance Test:
✅ **Checklist:**
- [ ] Can submit UGC when logged in
- [ ] Cannot submit UGC when logged out (401 error)
- [ ] Admin can approve UGC
- [ ] Regular user cannot approve UGC (403 error)
- [ ] Admin can whitelist users
- [ ] Leaderboard API returns data
- [ ] User profile API returns current user data

✅ **Test Scenarios:**
1. **Authenticated API call**: Log in → Submit artist → Success
2. **Unauthenticated API call**: Log out → Try to submit artist → 401 error
3. **Admin operation**: Log in as admin → Approve UGC → Success
4. **Non-admin operation**: Log in as user → Try to approve UGC → 403 error
5. **Token expiry**: Wait for token to expire → API call refreshes token automatically
6. **User migration**: Existing user logs in → `/api/user/me` links to Privy ID → Subsequent calls work

**Deliverable**: All server-side auth working on staging, old NextAuth routes removed

---

## **PHASE 5: End-to-End Testing & Staging Validation** (Week 5)
**Goal**: Comprehensive testing before production deployment

### Tasks:
1. Run full test suite: `npm run ci`
2. Update test mocks for Privy (`__mocks__/@privy-io/react-auth.ts`)
3. Fix any broken tests from migration
4. Load testing: Simulate 100+ concurrent logins
5. Security audit: Verify token verification, CSRF protection
6. Test all user flows end-to-end on staging
7. Create migration announcement banner component (optional, for future migrations)
8. Document new auth flow for developers

### Automated Tests:
- E2E test: Complete signup → login → submit artist → logout flow
- E2E test: Admin flow: login → approve UGC → whitelist user
- E2E test: Multi-device login (same user, different browsers)
- Performance test: Login completes in <3 seconds
- Coverage test: Maintain >80% test coverage

### Manual Acceptance Test:
✅ **Master Test Checklist (All Critical Flows):**

**Authentication:**
- [ ] New user signup (wallet)
- [ ] New user signup (email)
- [ ] Existing user login (wallet migration)
- [ ] Logout
- [ ] Session persistence (refresh page)
- [ ] Cross-tab sync (login on tab 1, tab 2 updates)

**User Features:**
- [ ] View artist page (logged out)
- [ ] Search artists (logged out)
- [ ] Add artist (requires login)
- [ ] Submit UGC for artist
- [ ] View own profile
- [ ] View leaderboard

**Admin Features:**
- [ ] Access admin dashboard
- [ ] Approve UGC submission
- [ ] Reject UGC submission
- [ ] Whitelist user
- [ ] Remove whitelist

**Edge Cases:**
- [ ] Login with wallet that has no prior account
- [ ] Login with wallet that has existing account (migration)
- [ ] Login with email (new authentication method)
- [ ] Role change propagates within 5 minutes
- [ ] Token expiry handled gracefully
- [ ] Invalid token returns proper error

✅ **Test Scenarios (With Expected Outcomes):**

**Scenario 1: Existing User Migration**
```
1. User has wallet 0xABC... in old system (isAdmin=true)
2. User logs in with wallet 0xABC... via Privy
3. Expected: User linked to Privy ID, isAdmin=true preserved
4. Verify: Check database for privy_user_id populated
5. Verify: User sees admin dashboard
```

**Scenario 2: New Email User**
```
1. User clicks "Log In" → "Email" option
2. User enters test@example.com
3. User receives code, enters code
4. Expected: New user created with email, no wallet
5. Verify: Can submit UGC
6. Verify: Not admin (no admin dashboard access)
```

**Scenario 3: Role Refresh**
```
1. User A logged in as regular user
2. Admin promotes User A to admin (different tab/device)
3. Wait 5 minutes
4. Expected: User A sees admin UI appear automatically
5. Verify: No page refresh needed
```

**Deliverable**: Staging environment fully tested and validated

---

## **PHASE 6: Production Deployment** (Week 6)
**Goal**: Deploy to production with monitoring

### Tasks:
1. Create production Privy app in dashboard
2. Set production environment variables
3. Run database migration on production: `privy_user_id` column
4. Deploy code to production (off-peak hours recommended)
5. Monitor error rates (Vercel logs, Sentry if configured)
6. Monitor user logins (Privy dashboard analytics)
7. Test critical flows on production
8. Monitor support requests for 48 hours

### Automated Tests:
- Smoke test: Production health check endpoint
- Smoke test: Can create test user on production
- Monitoring: Auth error rate <1%

### Manual Acceptance Test:
✅ **Production Deployment Checklist:**
- [ ] Database migration completed successfully
- [ ] Production build succeeds: `npm run build`
- [ ] Deployment successful (no errors in logs)
- [ ] Production site loads
- [ ] Can log in with test wallet
- [ ] Can log in with test email
- [ ] Test existing user migration (use real existing wallet)

✅ **Post-Deployment Monitoring (First 48 Hours):**
- [ ] Check error logs every 4 hours
- [ ] Privy dashboard: Monitor active users, success rate
- [ ] User feedback: Any login issues reported?
- [ ] Database: Check migration completion rate
  ```sql
  SELECT
    COUNT(*) as total_users,
    COUNT(privy_user_id) as migrated_users
  FROM users;
  ```

✅ **Rollback Criteria:**
If any of these occur, consider rollback:
- Auth error rate >10%
- Database corruption
- Critical security vulnerability discovered
- Unable to log in as admin

**Deliverable**: Production deployment complete, all users migrated successfully

---

## **PHASE 7: Cleanup & Documentation** (Post-deployment)
**Goal**: Remove old code, finalize documentation

### Tasks:
1. Remove unused dependencies from `package.json`
2. Delete old auth files (already removed in Phase 4, verify)
3. Update README with new auth setup instructions
4. Create `/docs/privy-auth.md` developer guide
5. Archive migration plan document
6. Celebrate! 🎉

### Automated Tests:
- Verify no unused dependencies: `npm run build` still works
- Verify no orphaned imports

### Manual Acceptance Test:
✅ **Checklist:**
- [ ] No NextAuth references in codebase: `grep -r "next-auth" src/`
- [ ] No RainbowKit references: `grep -r "rainbowkit" src/`
- [ ] Documentation updated
- [ ] Team trained on new auth system

**Deliverable**: Clean codebase, comprehensive documentation

---

## Success Metrics (Measure After 2 Weeks)
- ✅ Auth error rate <1%
- ✅ Login completion rate >95%
- ✅ New email signups (previously impossible)
- ✅ Average login time <5 seconds
- ✅ User migration rate 100%
- ✅ Zero auth-related production incidents

---

## Rollback Plan
If critical issues arise:
1. Revert to previous deployment (git tag before migration)
2. Restore database from backup (privy_user_id column doesn't break old system)
3. Re-enable old dependencies via `npm install`
4. Users will need to log in again (session invalidation acceptable)

---

## Timeline Summary
- **Week 1**: Foundation & Setup
- **Week 2**: Core Auth UI
- **Week 3**: Client Components
- **Week 4**: API Routes & Server
- **Week 5**: Testing & Validation
- **Week 6**: Production Deployment
- **Post**: Cleanup

**Total Duration: 6 weeks** (gradual, low-risk approach)

---

## Key Technical Details

### User Migration Flow
```typescript
// Automatic linking on first Privy login
async function handlePrivyLogin(privyUser) {
  // Try to find by Privy ID
  let user = await getUserByPrivyId(privyUser.id);

  if (!user && privyUser.wallet?.address) {
    // Migration: Find by wallet, link to Privy ID
    user = await getUserByWallet(privyUser.wallet.address);
    if (user) {
      await linkUserToPrivy(user.id, privyUser.id);
    }
  }

  // Create new user if not found
  if (!user) {
    user = await createUser({
      privyUserId: privyUser.id,
      wallet: privyUser.wallet?.address,
      email: privyUser.email?.address
    });
  }

  return user;
}
```

### Role Refresh Implementation
```typescript
// 5-minute polling in useUserData hook
useEffect(() => {
  if (!privyUserId) return;

  fetchUserData(); // Initial fetch

  // Poll every 5 minutes
  const interval = setInterval(fetchUserData, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [privyUserId]);
```

### Auth Pattern Changes

**Before (NextAuth):**
```typescript
const { data: session } = useSession();
if (!session) return <LoginPrompt />;
if (!session.user.isAdmin) return <Unauthorized />;
```

**After (Privy):**
```typescript
const { authenticated, user } = usePrivy();
const { data: dbUser, isLoading } = useUserData(user?.id);

if (!authenticated) return <LoginPrompt />;
if (isLoading) return <Spinner />;
if (!dbUser?.isAdmin) return <Unauthorized />;
```

---

## FAQ

### Q: What happens to existing user data?
**A**: All data is preserved. Users log in with their wallet, system automatically links to new Privy ID. Roles, submissions, leaderboard stats all maintained.

### Q: Can we enable social login later?
**A**: Yes, one-line config change:
```typescript
loginMethods: ['wallet', 'email', 'google', 'twitter', 'discord']
```

### Q: What if we need on-chain operations later?
**A**: Privy provides wallet methods (`sendTransaction`, `signMessage`). For advanced needs, re-add Wagmi or Viem alongside Privy.

### Q: How long will existing users be logged out?
**A**: Until they log in again via Privy. With small user base, immediate cutover is acceptable.

### Q: What's the cost?
**A**: Privy free tier supports up to 1,000 monthly active users. Growth tier ($99/mo) supports up to 10,000 MAU.

---

**Document Version:** 1.0
**Created:** 2025-11-10
**Status:** Ready for Implementation
