# Privy Authentication Migration - Detailed Implementation Plan

**Document Version:** 1.0  
**Created:** 2025-01-27  
**Status:** Draft  
**Related PRD:** `docs/privy_migration_prd.md`  
**Related Analysis:** `docs/authentication-analysis.md`

---

## Executive Summary

This plan provides a comprehensive, task-by-task implementation guide for migrating MusicNerdWeb from wallet-first authentication (RainbowKit + SIWE + Wagmi) to Privy's email/passkey-first authentication system. The migration preserves all existing user data, roles, and permissions while enabling legacy wallet-only users to recover their accounts through an explicit wallet-linking flow.

**Key Migration Principles:**
- Email/passkey becomes the single authentication method (both enabled immediately)
- Wallets become optional, post-login linkable credentials
- NextAuth remains the session boundary with custom Privy provider
- All roles and permissions are preserved
- Legacy users can recover accounts via CTA or profile-based merge
- **Big-bang deployment** - all changes deployed simultaneously (no gradual rollout)
- Account merges combine all UGC submissions and artist additions

---

## Table of Contents

1. [Pre-Migration Setup](#1-pre-migration-setup)
2. [Phase 1: Database Schema Updates](#2-phase-1-database-schema-updates)
3. [Phase 2: Privy SDK Integration](#3-phase-2-privy-sdk-integration)
4. [Phase 3: NextAuth Privy Provider](#4-phase-3-nextauth-privy-provider)
5. [Phase 4: Login UI Replacement](#5-phase-4-login-ui-replacement)
6. [Phase 5: Legacy Account Migration Flow](#6-phase-5-legacy-account-migration-flow)
7. [Phase 6: Account Merge Logic](#7-phase-6-account-merge-logic)
8. [Phase 7: Component Updates](#8-phase-7-component-updates)
9. [Phase 8: Testing & Validation](#9-phase-8-testing--validation)
10. [Phase 9: Legacy Package Removal](#10-phase-9-legacy-package-removal)
11. [Rollback Plan](#11-rollback-plan)
12. [File Change Summary](#12-file-change-summary)

---

## 1. Pre-Migration Setup

### Task 1.1: Privy Dashboard Configuration
**Priority:** Critical  
**Estimated Time:** 30 minutes  
**Dependencies:** None

**Actions:**
- [ ] Create Privy account at [dashboard.privy.io](https://dashboard.privy.io)
- [ ] Create new Privy app for MusicNerdWeb
- [ ] Configure authentication methods:
  - [ ] Enable **Email** authentication (required)
  - [ ] Enable **Passkey** authentication (WebAuthn) (required - both email and passkey enabled)
  - [ ] **Disable** wallet-based login
  - [ ] **Disable** social logins (Google, Twitter, etc.)
- [ ] Configure security settings:
  - [ ] Enable "Block temporary email domains"
  - [ ] Configure allowed origins (production + staging URLs)
  - [ ] Set session timeout (recommend: 30 days to match NextAuth)
- [ ] Obtain credentials:
  - [ ] Copy `PRIVY_APP_ID` (public, client-side safe)
  - [ ] Copy `PRIVY_APP_SECRET` (server-side only, keep secure)

**Deliverables:**
- Privy app configured with email/passkey only
- Credentials documented securely

---

### Task 1.2: Environment Variables Setup
**Priority:** Critical  
**Estimated Time:** 15 minutes  
**Dependencies:** Task 1.1

**Actions:**
- [ ] Add Privy environment variables to `.env.local`:
  ```bash
  # Privy Configuration
  NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
  PRIVY_APP_SECRET=your_privy_app_secret
  ```
- [ ] Update `src/env.ts` to validate Privy environment variables:
  - [ ] Add `NEXT_PUBLIC_PRIVY_APP_ID` validation
  - [ ] Add `PRIVY_APP_SECRET` validation (server-side only)
- [ ] Update `.env.example` with Privy variables (without actual values)
- [ ] Configure staging/production environment variables in deployment platform

**Files to Modify:**
- `src/env.ts` - Add Privy env validation
- `.env.example` - Add Privy variables template
- `.env.local` - Add actual Privy credentials

**Deliverables:**
- Environment variables configured and validated
- `env.ts` updated with Privy schema

---

### Task 1.3: Create Migration Branch
**Priority:** High  
**Estimated Time:** 5 minutes  
**Dependencies:** None

**Actions:**
- [ ] Create feature branch: `git checkout -b feature/privy-migration`
- [ ] Ensure working tree is clean
- [ ] Create backup branch: `git branch backup/pre-privy-migration`

**Deliverables:**
- Feature branch created
- Backup branch for rollback safety

---

## 2. Phase 1: Database Schema Updates

### Task 2.1: Add `privy_user_id` Column to Users Table
**Priority:** Critical  
**Estimated Time:** 1 hour  
**Dependencies:** Task 1.3

**Actions:**
- [ ] Update `src/server/db/schema.ts`:
  - [ ] Add `privyUserId` field to `users` table:
    ```typescript
    privyUserId: text("privy_user_id").unique(),
    ```
  - [ ] Ensure `wallet` column remains (for legacy matching)
  - [ ] Keep all existing role flags unchanged
- [ ] Generate migration: `npm run db:generate`
- [ ] Review generated migration SQL in `drizzle/` directory
- [ ] Test migration locally: `npm run db:push` (or `db:migrate`)
- [ ] Verify migration:
  - [ ] Column exists in database
  - [ ] Unique constraint applied
  - [ ] Existing records unaffected (all `privy_user_id` should be NULL)

**Files to Modify:**
- `src/server/db/schema.ts` - Add `privyUserId` field

**Files Created:**
- `drizzle/XXXX_add_privy_user_id.sql` - Migration file

**Deliverables:**
- Database schema updated with `privy_user_id` column
- Migration tested and verified

---

### Task 2.2: Update User Query Functions
**Priority:** Critical  
**Estimated Time:** 1.5 hours  
**Dependencies:** Task 2.1

**Actions:**
- [ ] Review `src/server/utils/queries/userQueries.ts`
- [ ] Add new query functions:
  - [ ] `getUserByPrivyId(privyUserId: string)` - Lookup by Privy ID
  - [ ] `createUserWithPrivyId(privyUserId: string, email?: string)` - Create new user with Privy ID
  - [ ] `linkPrivyIdToUser(userId: string, privyUserId: string)` - Link Privy ID to existing user
  - [ ] `getUserByWallet(wallet: string)` - Keep existing (for legacy matching)
- [ ] Update `createUser` function to accept optional `privyUserId` parameter
- [ ] Add TypeScript types for new functions
- [ ] Add error handling for unique constraint violations

**Files to Modify:**
- `src/server/utils/queries/userQueries.ts` - Add Privy-related queries

**Deliverables:**
- Query functions for Privy user management
- Backward-compatible with existing wallet-based queries

---

### Task 2.3: Create Account Merge Utility Functions
**Priority:** High  
**Estimated Time:** 2 hours  
**Dependencies:** Task 2.2

**Actions:**
- [ ] Create `src/server/utils/queries/accountMerge.ts`:
  - [ ] `findLegacyAccountByWallet(wallet: string)` - Find legacy user by wallet
  - [ ] `mergeAccounts(sourceUserId: string, targetUserId: string)` - Merge two accounts:
    - [ ] **Transfer all UGC submissions** (`ugcresearch.userId`) → Merge all submissions to target account
    - [ ] **Transfer artist additions** (`artists.addedBy`) → Merge all additions to target account
    - [ ] **Preserve highest role flags** (admin > whitelist > regular)
    - [ ] **Preserve oldest `createdAt` timestamp** → Use earliest creation date
    - [ ] **Update `privy_user_id`** on target account
    - [ ] **Archive or delete source account** → Soft delete or mark as merged
  - [ ] `canMergeAccounts(userId1: string, userId2: string)` - Check if merge is safe
- [ ] Add transaction support for atomic merges
- [ ] Add logging for audit trail
- [ ] Handle edge cases:
  - [ ] **Both accounts have UGC submissions** → Merge all UGC submissions to target account
  - [ ] **Both accounts have artist additions** → Merge all artist additions to target account
  - [ ] **Role conflicts** → Preserve highest role (admin > whitelist > regular)

**Files Created:**
- `src/server/utils/queries/accountMerge.ts` - Account merge logic

**Deliverables:**
- Account merge utility functions
- Transaction-safe merge operations
- Comprehensive error handling

---

## 3. Phase 2: Privy SDK Integration

### Task 3.1: Install Privy Packages
**Priority:** Critical  
**Estimated Time:** 15 minutes  
**Dependencies:** Task 1.2

**Actions:**
- [ ] Install Privy React SDK: `npm install @privy-io/react-auth`
- [ ] Install Privy server SDK: `npm install @privy-io/server-auth`
- [ ] Verify installation: `npm list @privy-io/react-auth @privy-io/server-auth`
- [ ] Check for peer dependency conflicts

**Deliverables:**
- Privy packages installed
- No dependency conflicts

---

### Task 3.2: Create Privy Provider Component
**Priority:** Critical  
**Estimated Time:** 1 hour  
**Dependencies:** Task 3.1

**Actions:**
- [ ] Create `src/app/_components/PrivyProvider.tsx`:
  - [ ] Import `PrivyProvider` from `@privy-io/react-auth`
  - [ ] Configure Privy with:
    - [ ] `appId` from `NEXT_PUBLIC_PRIVY_APP_ID`
    - [ ] `config.loginMethods: ['email', 'passkey']` (both enabled - no wallet login)
    - [ ] `config.embeddedWallets.createOnLogin: 'never'` (per PRD)
    - [ ] `config.embeddedWallets.noPromptOnSignature: true`
  - [ ] Wrap children with PrivyProvider
  - [ ] Add error boundary for Privy initialization failures
- [ ] Update `src/app/layout.tsx`:
  - [ ] Replace `LoginProviders` with `PrivyProvider`
  - [ ] Keep `SessionProvider` (NextAuth) wrapping PrivyProvider
  - [ ] Maintain existing provider order

**Files Created:**
- `src/app/_components/PrivyProvider.tsx` - Privy React provider

**Files to Modify:**
- `src/app/layout.tsx` - Replace LoginProviders with PrivyProvider

**Deliverables:**
- Privy provider integrated into app layout
- Configuration matches PRD requirements

---

### Task 3.3: Create Privy Server Client Utility
**Priority:** High  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 3.1

**Actions:**
- [ ] Create `src/server/utils/privy.ts`:
  - [ ] Import `PrivyClient` from `@privy-io/server-auth`
  - [ ] Initialize singleton Privy client with `PRIVY_APP_SECRET`
  - [ ] Export utility functions:
    - [ ] `getPrivyClient()` - Get singleton instance
    - [ ] `verifyPrivyToken(accessToken: string)` - Verify Privy access token
    - [ ] `getPrivyUser(accessToken: string)` - Get Privy user data
- [ ] Add error handling for invalid tokens
- [ ] Add TypeScript types

**Files Created:**
- `src/server/utils/privy.ts` - Privy server utilities

**Deliverables:**
- Server-side Privy client configured
- Token verification utilities

---

## 4. Phase 3: NextAuth Privy Provider

### Task 4.1: Create Privy Credentials Provider
**Priority:** Critical  
**Estimated Time:** 2 hours  
**Dependencies:** Task 3.3, Task 2.2

**Actions:**
- [ ] Update `src/server/auth.ts`:
  - [ ] Import Privy utilities from `src/server/utils/privy.ts`
  - [ ] Create new `PrivyProvider` (CredentialsProvider):
    - [ ] Accept `accessToken` as credential
    - [ ] Verify token using `verifyPrivyToken()`
    - [ ] Extract `privy_user_id` from verified token
    - [ ] Lookup user by `privy_user_id` using `getUserByPrivyId()`
    - [ ] If no user found, create new user with `createUserWithPrivyId()`
    - [ ] Return NextAuth user object with all role flags
  - [ ] Keep existing `Ethereum` provider temporarily (for parallel testing)
  - [ ] Update `authorize` function to handle Privy tokens
- [ ] Update JWT callback:
  - [ ] Store `privy_user_id` in token (if available)
  - [ ] Keep `walletAddress` for backward compatibility
  - [ ] Maintain role refresh logic (5-minute refresh)
- [ ] Update session callback:
  - [ ] Include `privy_user_id` in session
  - [ ] Keep `walletAddress` for backward compatibility

**Files to Modify:**
- `src/server/auth.ts` - Add Privy provider, update callbacks

**Deliverables:**
- NextAuth configured with Privy provider
- Backward-compatible session structure

---

### Task 4.2: Update NextAuth Type Definitions
**Priority:** High  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 4.1

**Actions:**
- [ ] Update `src/server/auth.ts` type augmentations:
  - [ ] Add `privyUserId?: string` to `Session.user`
  - [ ] Add `privyUserId?: string` to `User` interface
  - [ ] Add `privyUserId?: string` to `JWT` interface
- [ ] Ensure all role flags remain in types
- [ ] Update TypeScript to verify no type errors

**Files to Modify:**
- `src/server/auth.ts` - Update type definitions

**Deliverables:**
- TypeScript types updated for Privy integration

---

## 5. Phase 4: Login UI Replacement

### Task 5.1: Create Privy Login Component
**Priority:** Critical  
**Estimated Time:** 2 hours  
**Dependencies:** Task 3.2

**Actions:**
- [ ] Create `src/app/_components/nav/components/PrivyLogin.tsx`:
  - [ ] Import `usePrivy` hook from `@privy-io/react-auth`
  - [ ] Import `useSession`, `signIn` from `next-auth/react`
  - [ ] Implement login flow:
    - [ ] Show Privy login modal on button click
    - [ ] After Privy authentication, get `accessToken`
    - [ ] Call NextAuth `signIn('privy', { accessToken })`
    - [ ] Handle success/error states
  - [ ] Implement logout flow:
    - [ ] Call Privy `logout()` method
    - [ ] Call NextAuth `signOut()`
  - [ ] Display user info (email from Privy)
  - [ ] Match existing Login component styling
- [ ] Add loading states
- [ ] Add error handling

**Files Created:**
- `src/app/_components/nav/components/PrivyLogin.tsx` - New login component

**Deliverables:**
- Privy-based login component
- Integrated with NextAuth session

---

### Task 5.2: Replace Login Component Usage
**Priority:** Critical  
**Estimated Time:** 1 hour  
**Dependencies:** Task 5.1

**Actions:**
- [ ] Update `src/app/_components/nav/components/Login.tsx`:
  - [ ] Option 1: Replace entire component with `PrivyLogin`
  - [ ] Option 2: Add feature flag to switch between old/new
- [ ] Update all imports of `Login` component
- [ ] Remove wallet connection logic
- [ ] Remove RainbowKit/Wagmi hooks
- [ ] Test login flow end-to-end

**Files to Modify:**
- `src/app/_components/nav/components/Login.tsx` - Replace with Privy version

**Files to Update (check imports):**
- `src/app/_components/nav/components/Nav.tsx` (or similar)
- Any other components importing Login

**Deliverables:**
- Login component replaced throughout app
- No wallet connection UI remains

---

### Task 5.3: Remove LoginProviders Component
**Priority:** Medium  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 5.2

**Actions:**
- [ ] Verify `LoginProviders.tsx` is no longer used
- [ ] Delete `src/app/_components/nav/components/LoginProviders.tsx`
- [ ] Remove RainbowKit/Wagmi provider setup
- [ ] Update `src/app/layout.tsx` if needed

**Files to Delete:**
- `src/app/_components/nav/components/LoginProviders.tsx`

**Deliverables:**
- Legacy provider component removed

---

## 6. Phase 5: Legacy Account Migration Flow

### Task 6.1: Create Post-Login CTA Component
**Priority:** Critical  
**Estimated Time:** 2 hours  
**Dependencies:** Task 5.1, Task 2.2

**Actions:**
- [ ] Create `src/app/_components/WalletLinkCTA.tsx`:
  - [ ] Check if user has `privy_user_id` but no `wallet` (new user)
  - [ ] Show CTA modal/banner:
    - [ ] Title: "Have an existing Music Nerd wallet-based account?"
    - [ ] Description: "Connect your wallet to link your old account and restore your history."
    - [ ] "Connect Wallet" button
    - [ ] "Skip" / "Not now" button (dismissible)
  - [ ] Use Privy's `useWallets()` hook for wallet linking
  - [ ] On wallet connect:
    - [ ] Get wallet address from Privy
    - [ ] Call API endpoint to check for legacy account
    - [ ] If found, trigger account merge
    - [ ] If not found, link wallet to current account
  - [ ] Store dismissal state in localStorage (don't show again for this session)
- [ ] Add to post-login flow (after successful Privy login)

**Files Created:**
- `src/app/_components/WalletLinkCTA.tsx` - CTA component

**Deliverables:**
- Post-login CTA for legacy account recovery
- Wallet linking via Privy

---

### Task 6.2: Create Wallet Linking API Endpoint
**Priority:** Critical  
**Estimated Time:** 1.5 hours  
**Dependencies:** Task 6.1, Task 2.3

**Actions:**
- [ ] Create `src/app/api/wallet/link/route.ts`:
  - [ ] Verify user is authenticated (NextAuth session)
  - [ ] Accept `walletAddress` in request body
  - [ ] Validate wallet address format
  - [ ] Check for legacy account with that wallet:
    - [ ] If found: Return `{ legacyAccountFound: true, userId: string }`
    - [ ] If not found: Link wallet to current account, return `{ legacyAccountFound: false }`
  - [ ] Handle errors (invalid wallet, already linked, etc.)
- [ ] Add authorization check (user must be authenticated)

**Files Created:**
- `src/app/api/wallet/link/route.ts` - Wallet linking API

**Deliverables:**
- API endpoint for wallet linking
- Legacy account detection

---

### Task 6.3: Create Account Merge API Endpoint
**Priority:** Critical  
**Estimated Time:** 2 hours  
**Dependencies:** Task 6.2, Task 2.3

**Actions:**
- [ ] Create `src/app/api/account/merge/route.ts`:
  - [ ] Verify user is authenticated
  - [ ] Accept `legacyUserId` in request body
  - [ ] Verify current user has `privy_user_id`
  - [ ] Call `mergeAccounts(currentUserId, legacyUserId)`
  - [ ] Return merge result with status
  - [ ] Handle errors:
    - [ ] User not authenticated
    - [ ] Invalid legacy user ID
    - [ ] Merge conflicts
    - [ ] Database errors
- [ ] Add logging for audit trail
- [ ] Return detailed merge summary (what was merged)

**Files Created:**
- `src/app/api/account/merge/route.ts` - Account merge API

**Deliverables:**
- API endpoint for account merging
- Comprehensive error handling

---

### Task 6.4: Integrate CTA into Post-Login Flow
**Priority:** High  
**Estimated Time:** 1 hour  
**Dependencies:** Task 6.1, Task 6.2, Task 6.3

**Actions:**
- [ ] Update `src/app/_components/nav/components/PrivyLogin.tsx`:
  - [ ] After successful login, check if user needs CTA
  - [ ] Show `WalletLinkCTA` component conditionally
- [ ] Or create `src/app/_components/PostLoginFlow.tsx`:
  - [ ] Wrap app content or specific routes
  - [ ] Check session state after login
  - [ ] Show CTA if conditions met
- [ ] Test flow:
  - [ ] New user → sees CTA → can skip
  - [ ] New user → sees CTA → links wallet → no legacy account → wallet linked
  - [ ] Legacy user → sees CTA → links wallet → legacy account found → merge triggered

**Files Created/Modified:**
- `src/app/_components/PostLoginFlow.tsx` (optional)
- `src/app/_components/nav/components/PrivyLogin.tsx` (update)

**Deliverables:**
- CTA integrated into login flow
- Conditional display logic working

---

## 7. Phase 6: Account Merge Logic

### Task 7.1: Implement Profile Page Wallet Linking
**Priority:** High  
**Estimated Time:** 2 hours  
**Dependencies:** Task 6.1, Task 6.2, Task 6.3

**Actions:**
- [ ] Update `src/app/profile/Dashboard.tsx` (or profile page):
  - [ ] Add "Link Wallet" section (if wallet not linked)
  - [ ] Add "Merge Legacy Account" button (if wallet not linked)
  - [ ] Show linked wallet address (if wallet is linked)
  - [ ] Use Privy `useWallets()` for wallet connection
  - [ ] Call wallet linking API on connect
  - [ ] Show merge confirmation if legacy account found
  - [ ] Display merge status/results
- [ ] Add UI for:
  - [ ] "Have an older Music Nerd wallet-based account?"
  - [ ] "Connect your wallet to merge accounts and restore your history."
  - [ ] Wallet connection button
  - [ ] Merge confirmation dialog
- [ ] **Note:** Multiple wallet linking and unlinking features are out of scope for initial migration

**Files to Modify:**
- `src/app/profile/Dashboard.tsx` - Add wallet linking UI

**Deliverables:**
- Profile page wallet linking functionality
- Account merge UI

---

### Task 7.2: Implement Merge Confirmation Flow
**Priority:** High  
**Estimated Time:** 1.5 hours  
**Dependencies:** Task 7.1

**Actions:**
- [ ] Create `src/app/_components/AccountMergeDialog.tsx`:
  - [ ] Show merge preview:
    - [ ] Current account info (email, creation date)
    - [ ] Legacy account info (wallet, creation date, UGC count, etc.)
  - [ ] List what will be merged:
    - [ ] UGC submissions count
    - [ ] Artist additions count
    - [ ] Role flags (show which will be preserved)
  - [ ] "Confirm Merge" button
  - [ ] "Cancel" button
  - [ ] Show loading state during merge
  - [ ] Show success/error messages
- [ ] Integrate with merge API endpoint
- [ ] Refresh session after successful merge

**Files Created:**
- `src/app/_components/AccountMergeDialog.tsx` - Merge confirmation UI

**Deliverables:**
- User-friendly merge confirmation dialog
- Clear preview of merge consequences

---

### Task 7.3: Add Merge Status Tracking
**Priority:** Medium  
**Estimated Time:** 1 hour  
**Dependencies:** Task 7.2

**Actions:**
- [ ] Add merge tracking to database (optional):
  - [ ] Create `account_merges` table (if needed for audit)
  - [ ] Log merge events: timestamp, source user, target user, merged data
- [ ] Or use application logs
- [ ] Add merge status to user session (temporary flag)
- [ ] Show "Account merged successfully" message after merge

**Files Created (optional):**
- `src/server/db/schema.ts` - Add `account_merges` table
- Migration file for merge tracking

**Deliverables:**
- Merge audit trail (logs or database)

---

## 8. Phase 7: Component Updates

### Task 8.1: Remove Wallet-Dependent Components
**Priority:** Medium  
**Estimated Time:** 1 hour  
**Dependencies:** Task 5.2

**Actions:**
- [ ] Search codebase for wallet-dependent code:
  - [ ] `useAccount` from wagmi
  - [ ] `useConnectModal` from RainbowKit
  - [ ] `useEnsAvatar` hook (if ENS-specific)
  - [ ] Wallet disconnect handlers
- [ ] Update or remove:
  - [ ] `src/hooks/useEnsAvatar.ts` - Update to use email/Privy avatar if needed
  - [ ] Any components checking `session.user.walletAddress` for auth
  - [ ] Wallet connection prompts
- [ ] Keep wallet display (if wallet is linked) but remove connection UI

**Files to Review/Modify:**
- `src/hooks/useEnsAvatar.ts`
- `src/app/_components/nav/components/Login.tsx` (already updated)
- Any components using `useAccount`, `useConnectModal`

**Deliverables:**
- Wallet-dependent code removed or updated
- App works without wallet connection

---

### Task 8.2: Update User Avatar/Profile Display
**Priority:** Medium  
**Estimated Time:** 1 hour  
**Dependencies:** Task 8.1

**Actions:**
- [ ] Update avatar display logic:
  - [ ] Use Privy user avatar (if available)
  - [ ] Fallback to email-based avatar (e.g., using user's email)
  - [ ] Remove ENS avatar logic (or make it optional for linked wallets)
  - [ ] Keep default avatar fallback
- [ ] Update profile display:
  - [ ] Show email (from Privy) as primary identifier
  - [ ] Show linked wallet address (if wallet is linked)
  - [ ] Remove wallet as primary identifier

**Files to Modify:**
- `src/app/_components/nav/components/Login.tsx` (avatar display)
- `src/app/profile/Dashboard.tsx` (profile info)

**Deliverables:**
- Avatar uses Privy/email instead of ENS
- Profile shows email as primary identifier

---

### Task 8.3: Update Authorization Checks
**Priority:** Critical  
**Estimated Time:** 1 hour  
**Dependencies:** Task 4.1

**Actions:**
- [ ] Review all authorization checks:
  - [ ] Server-side: `getServerAuthSession()` calls
  - [ ] Client-side: `useSession()` checks
  - [ ] API routes: session verification
- [ ] Ensure checks work with Privy sessions:
  - [ ] `session.user.id` should still work (UUID from database)
  - [ ] `session.user.privyUserId` available but not required for auth
  - [ ] Role flags (`isAdmin`, `isWhiteListed`) still work
- [ ] Update any wallet-specific checks:
  - [ ] Remove `session.user.walletAddress` as auth requirement
  - [ ] Keep wallet checks optional (for wallet-linked features)

**Files to Review:**
- `src/app/admin/page.tsx`
- `src/app/api/admin/**/*.ts`
- `src/app/api/pendingUGCCount/route.ts`
- Any protected routes/pages

**Deliverables:**
- Authorization checks work with Privy sessions
- No wallet requirement for basic auth

---

## 9. Phase 8: Testing & Validation

### Task 9.1: Unit Tests for Privy Integration
**Priority:** High  
**Estimated Time:** 3 hours  
**Dependencies:** Task 4.1, Task 6.2, Task 6.3

**Actions:**
- [ ] Create `src/server/utils/__tests__/privy.test.ts`:
  - [ ] Test `verifyPrivyToken()` with valid/invalid tokens
  - [ ] Test `getPrivyUser()` extraction
- [ ] Create `src/server/utils/queries/__tests__/accountMerge.test.ts`:
  - [ ] Test `mergeAccounts()` function
  - [ ] Test `findLegacyAccountByWallet()`
  - [ ] Test merge with UGC transfers
  - [ ] Test merge with role preservation
- [ ] Create `src/app/api/__tests__/wallet-link.test.ts`:
  - [ ] Test wallet linking API
  - [ ] Test legacy account detection
- [ ] Create `src/app/api/__tests__/account-merge.test.ts`:
  - [ ] Test merge API endpoint
  - [ ] Test error cases
- [ ] Update `src/server/utils/__tests__/web3-auth.test.ts`:
  - [ ] Mark as deprecated or remove (SIWE tests)
  - [ ] Or keep for rollback testing

**Files Created:**
- `src/server/utils/__tests__/privy.test.ts`
- `src/server/utils/queries/__tests__/accountMerge.test.ts`
- `src/app/api/__tests__/wallet-link.test.ts`
- `src/app/api/__tests__/account-merge.test.ts`

**Deliverables:**
- Comprehensive unit test coverage
- All tests passing

---

### Task 9.2: Integration Tests for Login Flow
**Priority:** High  
**Estimated Time:** 2 hours  
**Dependencies:** Task 5.1

**Actions:**
- [ ] Create `src/__tests__/privy-login-flow.test.tsx`:
  - [ ] Test new user login flow
  - [ ] Test returning user login flow
  - [ ] Test session creation
  - [ ] Test logout flow
- [ ] Mock Privy SDK for testing
- [ ] Test CTA display logic
- [ ] Test wallet linking flow

**Files Created:**
- `src/__tests__/privy-login-flow.test.tsx`

**Deliverables:**
- Integration tests for login flow
- Mock setup for Privy SDK

---

### Task 9.3: End-to-End Migration Testing
**Priority:** Critical  
**Estimated Time:** 4 hours  
**Dependencies:** All previous tasks

**Actions:**
- [ ] **Test in staging environment** before production deployment
- [ ] Test new user flow:
  - [ ] Sign up with email via Privy
  - [ ] Sign up with passkey via Privy
  - [ ] Account created with `privy_user_id`
  - [ ] CTA appears (can be dismissed)
  - [ ] User can proceed without wallet
- [ ] Test returning email user flow:
  - [ ] Login with existing email
  - [ ] Login with existing passkey
  - [ ] Session created successfully
  - [ ] No CTA shown (already has account)
- [ ] Test legacy user recovery flow:
  - [ ] Create legacy account (wallet-only, no `privy_user_id`)
  - [ ] Login with Privy (new email)
  - [ ] CTA appears
  - [ ] Link wallet → legacy account found
  - [ ] Merge triggered → account restored
  - [ ] Verify UGC, artists, roles preserved
- [ ] Test profile-based merge:
  - [ ] Legacy user skips CTA → creates new account
  - [ ] Go to profile → "Merge Legacy Account" button
  - [ ] Link wallet → merge triggered
  - [ ] Verify merge success
- [ ] Test merge scenarios:
  - [ ] **Both accounts have UGC** → All UGC merged to target account
  - [ ] **Both accounts have artist additions** → All additions merged to target account
  - [ ] **Role conflicts** → Highest role preserved (admin > whitelist > regular)
- [ ] Test edge cases:
  - [ ] User with both `privy_user_id` and `wallet` (already linked)
  - [ ] Merge conflicts (both accounts have data) → All data merged

**Deliverables:**
- Comprehensive E2E test scenarios
- All migration paths validated

---

### Task 9.4: Update Test Mocks
**Priority:** Medium  
**Estimated Time:** 1 hour  
**Dependencies:** Task 9.1

**Actions:**
- [ ] Create `__mocks__/privy.js`:
  - [ ] Mock `@privy-io/react-auth` hooks
  - [ ] Mock `usePrivy()`, `useWallets()`
  - [ ] Mock Privy login/logout
- [ ] Update `jest.setup.ts` if needed
- [ ] Remove or update `__mocks__/rainbowkit.js` (mark as deprecated)
- [ ] Remove or update `__mocks__/wagmi.js` (mark as deprecated)

**Files Created:**
- `__mocks__/privy.js` - Privy mocks

**Files to Update:**
- `jest.setup.ts` - Update mock configuration

**Deliverables:**
- Privy mocks for testing
- Legacy mocks marked deprecated

---

## 10. Phase 9: Legacy Package Removal

### Task 10.1: Remove RainbowKit and SIWE Dependencies
**Priority:** Medium  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 9.4, All migration tasks complete

**Actions:**
- [ ] Verify no code references RainbowKit/Wagmi/SIWE:
  - [ ] Search for `@rainbow-me/rainbowkit`
  - [ ] Search for `wagmi`
  - [ ] Search for `siwe`
  - [ ] Search for `RainbowKitSiweNextAuthProvider`
- [ ] Remove packages:
  - [ ] `npm uninstall @rainbow-me/rainbowkit`
  - [ ] `npm uninstall @rainbow-me/rainbowkit-siwe-next-auth`
  - [ ] `npm uninstall wagmi`
  - [ ] `npm uninstall viem` (if only used for wallet)
  - [ ] `npm uninstall siwe`
- [ ] Verify `package.json` updated
- [ ] Run `npm install` to clean up

**Deliverables:**
- Legacy packages removed
- No broken imports

---

### Task 10.2: Remove Legacy Auth Files
**Priority:** Low  
**Estimated Time:** 30 minutes  
**Dependencies:** Task 10.1

**Actions:**
- [ ] Delete `src/lib/authAdapter.tsx` (SIWE adapter)
- [ ] Delete `__mocks__/rainbowkit.js` (or keep for reference)
- [ ] Delete `__mocks__/wagmi.js` (or keep for reference)
- [ ] Remove SIWE-related code from `src/server/auth.ts`:
  - [ ] Remove `Ethereum` CredentialsProvider
  - [ ] Remove SIWE imports
  - [ ] Clean up SIWE verification code
- [ ] Update comments/documentation

**Files to Delete:**
- `src/lib/authAdapter.tsx`

**Files to Modify:**
- `src/server/auth.ts` - Remove SIWE provider

**Deliverables:**
- Legacy auth code removed
- Codebase cleaned up

---

### Task 10.3: Update Documentation
**Priority:** Low  
**Estimated Time:** 1 hour  
**Dependencies:** Task 10.2

**Actions:**
- [ ] Update `docs/authentication-analysis.md`:
  - [ ] Add section on Privy authentication
  - [ ] Mark SIWE section as deprecated
  - [ ] Update architecture diagram
- [ ] Update `README.md`:
  - [ ] Update authentication section
  - [ ] Remove RainbowKit/Wagmi references
  - [ ] Add Privy setup instructions
- [ ] Update `CLAUDE.md` or `AGENTS.md`:
  - [ ] Update authentication context
  - [ ] Remove wallet-first references

**Files to Modify:**
- `docs/authentication-analysis.md`
- `README.md`
- `CLAUDE.md` or `AGENTS.md`

**Deliverables:**
- Documentation updated
- Migration documented

---

## 11. Rollback Plan

### Rollback Strategy
If critical issues are discovered after deployment:

1. **Immediate Rollback (Database)**
   - [ ] Revert database migration (remove `privy_user_id` column)
   - [ ] Restore previous schema version
   - [ ] All existing users remain functional

2. **Code Rollback**
   - [ ] Revert to `backup/pre-privy-migration` branch
   - [ ] Redeploy previous version
   - [ ] SIWE authentication restored

3. **Partial Rollback (Keep Privy, Restore SIWE)**
   - [ ] Keep `privy_user_id` column (nullable)
   - [ ] Restore SIWE provider alongside Privy
   - [ ] Allow both authentication methods temporarily
   - [ ] Gradual migration

### Rollback Triggers
- Critical authentication failures (>5% failure rate)
- Data loss during account merges
- Session management issues
- Performance degradation

---

## 12. File Change Summary

### Files Created
- `src/app/_components/PrivyProvider.tsx`
- `src/server/utils/privy.ts`
- `src/app/_components/nav/components/PrivyLogin.tsx`
- `src/app/_components/WalletLinkCTA.tsx`
- `src/app/_components/AccountMergeDialog.tsx`
- `src/app/api/wallet/link/route.ts`
- `src/app/api/account/merge/route.ts`
- `src/server/utils/queries/accountMerge.ts`
- `__mocks__/privy.js`
- `drizzle/XXXX_add_privy_user_id.sql`

### Files Modified
- `src/server/db/schema.ts` - Add `privyUserId`
- `src/server/auth.ts` - Add Privy provider, update callbacks
- `src/env.ts` - Add Privy env validation
- `src/app/layout.tsx` - Replace LoginProviders
- `src/app/_components/nav/components/Login.tsx` - Replace with Privy
- `src/server/utils/queries/userQueries.ts` - Add Privy queries
- `src/app/profile/Dashboard.tsx` - Add wallet linking UI
- `package.json` - Add/remove packages
- Various test files

### Files Deleted
- `src/app/_components/nav/components/LoginProviders.tsx`
- `src/lib/authAdapter.tsx`
- Potentially: `__mocks__/rainbowkit.js`, `__mocks__/wagmi.js`

---

## Implementation Timeline Estimate

**Total Estimated Time:** 40-50 hours

**Phase Breakdown:**
- Pre-Migration Setup: 1 hour
- Database Schema: 4.5 hours
- Privy SDK Integration: 2 hours
- NextAuth Integration: 3 hours
- Login UI: 3.5 hours
- Legacy Migration Flow: 6.5 hours
- Account Merge: 4.5 hours
- Component Updates: 3 hours
- Testing: 10 hours
- Package Removal: 1 hour
- Documentation: 1 hour

**Recommended Sprint Plan:**
- **Sprint 1:** Pre-migration + Database + Privy SDK (Week 1)
- **Sprint 2:** NextAuth + Login UI + Basic Testing (Week 2)
- **Sprint 3:** Legacy Migration + Account Merge (Week 3)
- **Sprint 4:** Component Updates + Comprehensive Testing in Staging (Week 4)
- **Sprint 5:** Package Removal + Documentation + Final Testing (Week 5)

**Deployment Strategy: Big-Bang Deployment**
- All changes deployed to production simultaneously
- No gradual rollout or feature flags
- Staging environment testing required before production deployment
- Rollback plan must be ready (see Rollback Plan section)

---

## Implementation Decisions

**Decisions Made:**

1. **Privy Configuration:**
   - ✅ Enable **both email and passkey** authentication immediately
   - No specific email provider restrictions needed

2. **Account Merge Strategy:**
   - ✅ **Merge all UGC submissions** when both accounts have them
   - ✅ **Merge all artist additions** when both accounts have them
   - ✅ **Preserve highest role** when conflicting (admin > whitelist > regular)

3. **Wallet Linking:**
   - ⏸️ Multiple wallet linking and unlinking features **deferred** (out of scope for initial migration)
   - Focus on single wallet linking for legacy account recovery

4. **Testing Environment:**
   - ✅ Staging environment available for testing
   - Test with both real legacy user data and test accounts

5. **Migration Timeline:**
   - ✅ **Big-bang deployment** strategy (no gradual rollout)
   - All changes deployed simultaneously to production

6. **Legacy User Communication:**
   - ✅ **No user communications** (no emails, no migration guides)
   - Users discover migration through normal login flow

---

## Success Criteria

- [ ] All users can authenticate via Privy email/passkey
- [ ] Wallet-based login is completely removed
- [ ] Legacy users can recover accounts through CTA or profile merge
- [ ] New users are not burdened by legacy flows
- [ ] All roles and permissions preserved
- [ ] Account merges work correctly without data loss
- [ ] All tests passing
- [ ] No performance degradation
- [ ] Documentation updated

---

**End of Implementation Plan**

