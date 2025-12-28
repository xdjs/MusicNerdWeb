# Privy Authentication Implementation Plan

## Overview

Migrate MusicNerdWeb from stubbed-out Web3 authentication to Privy email/passkey authentication, using NextAuth for session management. Includes legacy wallet account recovery and handling of stale Web3 JWT tokens.

---

## Phase 1: Package Installation & Server Setup

### 1.1 Install Packages

```bash
npm install @privy-io/react-auth @privy-io/server-auth next-auth
```

### 1.2 Create Privy Server Client

**New File:** `src/server/utils/privy.ts`

- Singleton `PrivyClient` instance
- `verifyPrivyToken(authToken)` - Verify Privy access tokens, return userId/email/linkedWallets
- `getPrivyUser(privyUserId)` - Fetch full Privy user data

---

## Phase 2: Database Query Functions

### 2.1 Add to `src/server/utils/queries/userQueries.ts`

New functions:
- `getUserByPrivyId(privyUserId)` - Find user by Privy ID
- `createUserFromPrivy({ privyUserId, email })` - Create new user from Privy login
- `linkWalletToUser(userId, walletAddress)` - Link wallet to existing user
- `updateUserPrivyId(userId, privyUserId)` - Update user's Privy ID (for legacy linking)
- `mergeAccounts(currentUserId, legacyUserId, privyUserId, email)` - Merge placeholder account into legacy account, transfer artists/UGC, delete placeholder

---

## Phase 3: NextAuth with Privy Credentials Provider

### 3.1 Update `src/server/auth.ts`

**Key Implementation Details:**

```typescript
// Token version to invalidate legacy Web3 tokens
const CURRENT_TOKEN_VERSION = 2;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'privy',
      name: 'Privy',
      credentials: {
        authToken: { label: 'Auth Token', type: 'text' },
      },
      async authorize(credentials) {
        // Verify Privy token
        // Get or create user by privyUserId
        // Return user with needsLegacyLink flag
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // CRITICAL: Invalidate legacy Web3 tokens
      // Legacy tokens have walletAddress but no privyUserId or wrong tokenVersion
      if (token.walletAddress && !token.privyUserId) {
        // Force re-authentication by returning minimal invalid token
        return { expired: true };
      }
      if (token.tokenVersion !== CURRENT_TOKEN_VERSION && !user) {
        return { expired: true };
      }

      // Initial sign in - set all fields including tokenVersion
      if (user) {
        token.tokenVersion = CURRENT_TOKEN_VERSION;
        token.id = user.id;
        token.privyUserId = user.privyUserId;
        // ... other fields
      }

      // 5-minute role refresh from database
      // ...

      return token;
    },

    async session({ session, token }) {
      // Return null session for expired/legacy tokens
      if (token.expired) {
        return null as any; // Forces client to show logged-out state
      }
      // ... build session from token
    },
  },
  // 30-day session, JWT strategy
};
```

**Session Type Extensions:**
- Add `privyUserId`, `needsLegacyLink` to Session.user
- Add `tokenVersion` to JWT type

### 3.2 Create NextAuth Route Handler

**New File:** `src/app/api/auth/[...nextauth]/route.ts`

Standard NextAuth handler exporting GET and POST.

---

## Phase 4: Provider Setup

### 4.1 Create Privy Provider Wrapper

**New File:** `src/app/_components/PrivyProviderWrapper.tsx`

```typescript
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
  config={{
    appearance: { theme: 'dark', accentColor: '#E91E8C' },
    loginMethods: ['email'],
    embeddedWallets: { createOnLogin: 'off' },
  }}
>
  {children}
</PrivyProvider>
```

### 4.2 Update `src/app/_components/Providers.tsx`

Wrap hierarchy: `PrivyProviderWrapper` → `SessionProvider` → `ThemeProvider` → `QueryClientProvider`

---

## Phase 5: Login UI

### 5.1 Update `src/app/_components/nav/components/Login.tsx`

- Use `usePrivy()` for Privy state and `useLogin()` for login flow
- Use `useSession()` for NextAuth session
- On Privy login complete: get access token, call `signIn('privy', { authToken })`
- Show legacy account modal when `session.user.needsLegacyLink` is true
- Handle logout: call both `signOut()` and `privyLogout()`
- **Handle legacy token expiry:** Check if session is null after being authenticated, prompt re-login

### 5.2 Create Legacy Account Modal

**New File:** `src/app/_components/nav/components/LegacyAccountModal.tsx`

- Shows after first Privy login for users without wallet
- Uses `useLinkAccount()` hook to trigger Privy wallet linking
- Calls `/api/auth/link-wallet` endpoint after wallet connected
- Dismissible with "Skip for now" option

### 5.3 Update `src/app/_components/nav/NavContent.tsx`

Include `<Login />` component in nav.

---

## Phase 6: Wallet Linking API

### 6.1 Create Link Wallet Endpoint

**New File:** `src/app/api/auth/link-wallet/route.ts`

```typescript
POST /api/auth/link-wallet
Body: { walletAddress: string }

Logic:
1. Verify session exists
2. Validate wallet address format
3. Check if wallet belongs to legacy user (getUserByWallet)
4. If legacy user found:
   - If already has different privyUserId → 409 Conflict
   - If same user → return success (already linked)
   - Otherwise → mergeAccounts() and return merged success
5. If no legacy user → linkWalletToUser() and return linked success
```

---

## Phase 7: Profile Page

### 7.1 Create Wallet Link Button Component

**New File:** `src/app/profile/components/WalletLinkButton.tsx`

- Uses `useLinkAccount()` from Privy
- Calls `/api/auth/link-wallet` after connection
- Shows toast on success/error
- Triggers session update

### 7.2 Update `src/app/profile/page.tsx`

- Server-side auth check with redirect
- Show account details (email, wallet, role)
- Show wallet link card if `!session.user.walletAddress`
- Include existing Leaderboard and UserEntriesTable components

---

## Phase 8: Protected Routes Restoration

### 8.1 Update `src/lib/apiErrors.ts`

Add `forbiddenResponse()` helper alongside existing `unauthorizedResponse()`.

### 8.2 API Routes to Update

Remove 401 stubs and restore auth checks:

| Route | Auth Required | Role Required |
|-------|---------------|---------------|
| `src/app/api/admin/whitelist-user/[id]/route.ts` | Yes | isAdmin |
| `src/app/api/user/[id]/route.ts` | Yes | Self or isAdmin |
| `src/app/api/userEntries/route.ts` | Yes | None |
| `src/app/api/ugcCount/route.ts` | Yes | None |
| `src/app/api/approvedUGCCount/route.ts` | Yes | None |
| `src/app/api/pendingUGCCount/route.ts` | Yes | isAdmin |
| `src/app/api/removeArtistData/route.ts` | Yes | isWhiteListed |
| `src/app/api/recentEdited/route.ts` | Yes | None |

Pattern for each:
```typescript
const session = await getServerAuthSession();
if (!session?.user) return unauthorizedResponse();
if (requiresAdmin && !session.user.isAdmin) return forbiddenResponse();
```

### 8.3 Update `src/app/admin/page.tsx`

- Server-side auth check
- Redirect to home if not authenticated
- Show UnauthorizedPage if not admin
- Restore admin dashboard content

---

## Phase 9: Server Actions

### 9.1 Update `src/app/actions/addArtist.ts`

- Get session with `getServerAuthSession()`
- Check `isWhiteListed` for permission
- Use `session.user.id` for `addedBy` field

---

## Phase 10: Cleanup

### 10.1 Update `src/types/stubs.d.ts`

Remove stubs for:
- `next-auth/react` (real package now installed)
- `next-auth` (real package now installed)
- `wagmi`, `viem`, `@rainbow-me/rainbowkit`, `react-jazzicon` (no longer needed)

### 10.2 Update `src/env.ts`

Ensure these variables are defined:
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

---

## Phase 11: Testing

### 11.1 Update `src/__tests__/setup.ts`

- Add Privy environment variables
- Mock `@privy-io/react-auth` hooks
- Mock `@privy-io/server-auth` client

### 11.2 Create Auth Tests

**New File:** `src/__tests__/auth/privy-auth.test.ts`

Test cases:
- Token verification (valid/invalid)
- New user creation from Privy
- Existing user lookup by Privy ID
- Legacy token invalidation (tokens without privyUserId should fail)
- Wallet linking without legacy account
- Account merge with legacy account
- Reject already-linked wallets

### 11.3 Run Full CI

```bash
npm run type-check && npm run lint && npm run test && npm run build
```

---

## Critical Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/server/utils/privy.ts` | Create | Privy server SDK wrapper |
| `src/server/utils/queries/userQueries.ts` | Modify | Add Privy-related queries |
| `src/server/auth.ts` | Replace | NextAuth config with Privy provider + legacy token handling |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | NextAuth route handler |
| `src/app/_components/PrivyProviderWrapper.tsx` | Create | Privy React provider |
| `src/app/_components/Providers.tsx` | Modify | Add PrivyProvider to hierarchy |
| `src/app/_components/nav/components/Login.tsx` | Replace | Privy login UI |
| `src/app/_components/nav/components/LegacyAccountModal.tsx` | Create | Wallet linking CTA modal |
| `src/app/api/auth/link-wallet/route.ts` | Create | Wallet linking + account merge API |
| `src/app/profile/components/WalletLinkButton.tsx` | Create | Profile wallet link button |
| `src/app/profile/page.tsx` | Replace | Restore with auth + wallet link UI |
| `src/app/admin/page.tsx` | Modify | Restore admin with auth checks |
| 8 API routes in `src/app/api/` | Modify | Restore auth checks |
| `src/types/stubs.d.ts` | Modify | Remove unnecessary stubs |

---

## Legacy Token Handling Summary

**Problem:** Users with long-lived JWT tokens from old Web3/SIWE auth will still have valid cookies after Privy migration.

**Solution:**
1. Add `tokenVersion: 2` to all new Privy-issued tokens
2. In JWT callback, detect legacy tokens by:
   - Has `walletAddress` but no `privyUserId`, OR
   - Missing `tokenVersion` or `tokenVersion !== 2`
3. Return `{ expired: true }` for legacy tokens
4. In session callback, return null for expired tokens
5. Client sees unauthenticated state, must re-login with Privy

This forces clean re-authentication without breaking the app.
