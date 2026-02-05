# Privy Authentication Code Review

## Architecture Overview

The implementation bridges Privy (email-first auth) with the existing NextAuth session system via a custom `CredentialsProvider`. The flow is:

1. User logs in via Privy SDK (email OTP)
2. Client obtains access token (with retry/fallback logic)
3. Token is sent to NextAuth's `authorize` callback
4. Server verifies token with Privy API
5. User is created/looked up in the database
6. JWT session is issued

This keeps the existing session infrastructure intact while swapping the authentication frontend.

## Files Reviewed

### Core Auth
- `src/server/utils/privy.ts` - Server-side token verification (3 code paths)
- `src/server/utils/privyConstants.ts` - Token prefix constants
- `src/server/auth.ts` - NextAuth config with Privy credentials provider

### UI Components
- `src/app/_components/PrivyProviderWrapper.tsx` - Provider setup
- `src/app/_components/nav/components/PrivyLogin.tsx` - Login flow with retry logic
- `src/app/_components/nav/components/LegacyAccountModal.tsx` - Wallet linking modal
- `src/app/_components/Providers.tsx` - Provider nesting

### Database & API
- `src/server/db/schema.ts` - Schema with `privyUserId` field
- `src/server/utils/queries/userQueries.ts` - Privy user queries and merge logic
- `src/app/api/auth/link-wallet/route.ts` - Wallet linking endpoint
- `drizzle/0001_add_privy_user_id.sql` - Migration

### Types & Mocks
- `src/types/next-auth.d.ts` - Session/JWT type augmentation
- `__mocks__/@privy-io/react-auth.js` - Client mock
- `__mocks__/@privy-io/server-auth.js` - Server mock
- `jest.config.ts` - Mock mappings

---

## Issues Found

### 1. No tests exist for any Privy code [HIGH]

There are zero test files covering the Privy authentication logic. The mocks at `__mocks__/@privy-io/` exist only to prevent existing tests from breaking. None of the following are tested:

- `verifyPrivyToken()` - three code paths (access token, identity token, direct Privy ID)
- `auth.ts` authorize callback, JWT refresh, session mapping
- `PrivyLogin.tsx` - complex client-side login flow with retry logic
- `LegacyAccountModal.tsx` - wallet linking UI
- `link-wallet/route.ts` - API endpoint with merge logic
- `createUserFromPrivy`, `getUserByPrivyId`, `mergeAccounts` - database functions

### 2. `privyid:` fallback bypasses real authentication [HIGH - Security]

In `PrivyLogin.tsx:126-131`, when both `getAccessToken()` and `getIdentityToken()` fail after all retries, the client falls back to sending `privyid:<userId>` directly. The server-side gate (`privy.ts:46-48`) correctly blocks this in production, but the client has no environment check and will attempt this in production — resulting in confusing error toasts for users experiencing Privy SDK timing issues.

### 3. Token type handling uses unsafe `any` cast [MEDIUM]

`PrivyLogin.tsx:98`:
```ts
token = typeof authToken === 'string' ? authToken : (authToken as any)?.token || (authToken as any)?.accessToken || null;
```

This casts through `any` to handle hypothetical non-string returns. If needed due to observed behavior, it should be documented. If speculative, it masks type errors.

### 4. `refreshLocks` is module-level state in serverless context [MEDIUM]

`auth.ts:8`: `const refreshLocks = new Map<string, Promise<void>>()` — In serverless deployments (Vercel), each cold start creates a fresh Map, making the lock ineffective across requests. The existing comment acknowledges staleness is acceptable, but the lock adds complexity for marginal benefit.

### 5. Post-merge session references a deleted user [MEDIUM - Data Integrity]

`userQueries.ts:391-394`: The merge deletes the current (new Privy) user and transfers `privyUserId` to the legacy user. The session's `token.sub` will reference a deleted user until the next JWT refresh (up to 5 minutes). Any API calls using `session.user.id` during this window will fail. `updateSession()` triggers a client-side refetch, not a forced JWT refresh.

### 6. Wallet address validation is duplicated [LOW]

The regex `/^0x[a-fA-F0-9]{40}$/` appears in both `userQueries.ts:316` and `link-wallet/route.ts:30`. Should be a shared constant.

### 7. `PrivyLogin` uses `forwardRef` without clear need [LOW]

The `forwardRef` wrapper at `PrivyLogin.tsx:29` adds complexity. If no parent component uses the ref, it should be removed.

---

## What's Done Well

- **Lazy initialization** of `PrivyClient` avoids build-time failures when env vars are missing
- **Graceful CI fallback** in `PrivyProviderWrapper` renders children without provider when unconfigured
- **Transaction-based merge** wraps all operations atomically to prevent partial merges
- **Wallet normalization** - consistently lowercased before storage
- **Shared token prefix constants** used by both client and server
- **409 Conflict** for already-linked wallets - correct HTTP semantics
- **Type augmentation** properly extends NextAuth's interfaces

## Recommendations (Priority Order)

1. **Add tests** for `verifyPrivyToken`, the `authorize` callback, `PrivyLogin` component, `link-wallet` route, and `mergeAccounts`
2. **Address post-merge session invalidation** - force a page reload or re-authentication after successful merge
3. **Remove or document the `(authToken as any)` cast** at `PrivyLogin.tsx:98`
4. **Extract wallet validation** to a shared utility
5. **Evaluate `refreshLocks`** value in your deployment model
