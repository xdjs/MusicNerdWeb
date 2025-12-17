# Privy Authentication Migration - Implementation Plan

**Document Version:** 1.1
**Created:** 2025-12-02
**Updated:** 2025-12-16
**Status:** In Progress
**Related PRD:** `docs/privy_migration_prd.md`

### Progress Tracker
| Phase | Status |
|-------|--------|
| 1. Pre-Migration Setup | ✅ Complete |
| 2. Database Schema Updates | ✅ Complete |
| 3. Privy SDK Integration | ✅ Complete |
| 4. NextAuth Privy Provider | ✅ Complete |
| 5. Login UI Implementation | ✅ Complete |
| 6. Legacy Account Migration Flow | ✅ Complete |
| 7. Account Merge Logic | ✅ Complete |
| 8. Remove Legacy Auth Packages | ⏳ Not Started |

---

## Executive Summary

This plan outlines the step-by-step implementation for migrating MusicNerdWeb from wallet-first authentication (RainbowKit + SIWE + Wagmi) to Privy's email/passkey-first authentication system. The migration preserves all existing user data and roles while enabling legacy wallet users to recover their accounts through a wallet-linking flow.

---

## Table of Contents

1. [Pre-Migration Setup](#1-pre-migration-setup)
2. [Phase 1: Database Schema Updates](#2-phase-1-database-schema-updates)
3. [Phase 2: Privy SDK Integration](#3-phase-2-privy-sdk-integration)
4. [Phase 3: NextAuth Privy Provider](#4-phase-3-nextauth-privy-provider)
5. [Phase 4: Login UI Implementation](#5-phase-4-login-ui-implementation)
6. [Phase 5: Legacy Account Migration Flow](#6-phase-5-legacy-account-migration-flow)
7. [Phase 6: Account Merge Logic](#7-phase-6-account-merge-logic)
8. [Phase 7: Remove Legacy Auth Packages](#8-phase-7-remove-legacy-auth-packages)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollback Plan](#10-rollback-plan)
11. [File Change Summary](#11-file-change-summary)

---

## 1. Pre-Migration Setup

### 1.1 Privy Dashboard Configuration
- [x] Create Privy account and app at [dashboard.privy.io](https://dashboard.privy.io)
- [x] Configure allowed login methods: **Email only** (disable wallet login, social logins)
- [x] Enable "Block temporary email domains" setting
- [x] Configure allowed origins (production + staging URLs)
- [x] Obtain `PRIVY_APP_ID` and `PRIVY_APP_SECRET`

### 1.2 Environment Variables ✅
Added to `.env.local` and `src/env.ts`:

```bash
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=cmiqjqibx00e1l40dxpe67mq6
PRIVY_APP_SECRET=<configured>
```

### 1.3 Create Staging Branch ✅
```bash
git checkout -b clt/claude-privy-migration
```

---

## 2. Phase 1: Database Schema Updates ✅

### 2.1 Add `privy_user_id` Column ✅

**File:** `src/server/db/schema.ts`

```typescript
export const users = pgTable("users", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  email: text("email"),
  username: text("username"),
  wallet: text("wallet"),  // Changed from .notNull() to nullable
  privyUserId: text("privy_user_id").unique(),  // NEW COLUMN
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' })
    .default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' })
    .default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
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
    usersPrivyUserIdKey: unique("users_privy_user_id_key").on(table.privyUserId),
  }
});
```

### 2.2 Generate and Run Migration ✅

```bash
npm run db:generate
npm run db:push  # For staging
# Review migration file before applying to production
```

### 2.3 Migration SQL (for reference) ✅
```sql
-- Add privy_user_id column
ALTER TABLE users ADD COLUMN privy_user_id TEXT UNIQUE;

-- Make wallet nullable
ALTER TABLE users ALTER COLUMN wallet DROP NOT NULL;

-- Add index for privy_user_id lookups
CREATE UNIQUE INDEX users_privy_user_id_key ON users(privy_user_id);
```

---

## 3. Phase 2: Privy SDK Integration

### 3.1 Install Privy Packages

```bash
npm install @privy-io/react-auth@latest
```

### 3.2 Create Privy Provider

**New File:** `src/app/_components/PrivyProviderWrapper.tsx`

```typescript
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyProviderWrapperProps {
  children: ReactNode;
}

export function PrivyProviderWrapper({ children }: PrivyProviderWrapperProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Appearance
        appearance: {
          theme: 'dark',
          accentColor: '#E91E8C', // MusicNerd pink
          logo: '/logo.png',
        },
        // Login methods - email only
        loginMethods: ['email'],
        // Embedded wallets configuration
        embeddedWallets: {
          createOnLogin: 'off', // Don't auto-create embedded wallets
        },
        // External wallets - enable for linking only (not login)
        externalWallets: {
          coinbaseWallet: {
            connectionOptions: 'smartWalletOnly',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

### 3.3 Update Root Layout Providers

**File:** `src/app/_components/Providers.tsx`

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrivyProviderWrapper } from './PrivyProviderWrapper';
import { ThemeProvider } from './ThemeProvider';
import { ReactNode, useState } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <PrivyProviderWrapper>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </QueryClientProvider>
    </PrivyProviderWrapper>
  );
}
```

---

## 4. Phase 3: NextAuth Privy Provider

### 4.1 Create Privy Token Verification Utility

**New File:** `src/server/utils/privy.ts`

```typescript
import { PrivyClient } from '@privy-io/server-auth';

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface PrivyVerificationResult {
  userId: string;
  email?: string;
  linkedAccounts: Array<{
    type: string;
    address?: string;
    email?: string;
  }>;
}

export async function verifyPrivyToken(
  authToken: string
): Promise<PrivyVerificationResult | null> {
  try {
    const verifiedClaims = await privyClient.verifyAuthToken(authToken);

    // Get full user details
    const user = await privyClient.getUser(verifiedClaims.userId);

    return {
      userId: user.id,
      email: user.email?.address,
      linkedAccounts: user.linkedAccounts.map((account) => ({
        type: account.type,
        address: account.type === 'wallet' ? account.address : undefined,
        email: account.type === 'email' ? account.address : undefined,
      })),
    };
  } catch (error) {
    console.error('[Privy] Token verification failed:', error);
    return null;
  }
}

export async function getPrivyUser(privyUserId: string) {
  try {
    return await privyClient.getUser(privyUserId);
  } catch (error) {
    console.error('[Privy] Failed to get user:', error);
    return null;
  }
}
```

### 4.2 Install Privy Server Auth Package

```bash
npm install @privy-io/server-auth
```

### 4.3 Update NextAuth Configuration

**File:** `src/server/auth.ts`

```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPrivyToken } from './utils/privy';
import {
  getUserByPrivyId,
  getUserByWallet,
  createUserFromPrivy,
  updateUserPrivyId
} from './utils/queries/userQueries';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'privy',
      name: 'Privy',
      credentials: {
        authToken: { label: 'Auth Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.authToken) {
          console.error('[Auth] No auth token provided');
          return null;
        }

        // Verify the Privy token
        const privyUser = await verifyPrivyToken(credentials.authToken);
        if (!privyUser) {
          console.error('[Auth] Privy token verification failed');
          return null;
        }

        // Look up user by Privy ID
        let user = await getUserByPrivyId(privyUser.userId);

        if (!user) {
          // New user - create account
          user = await createUserFromPrivy({
            privyUserId: privyUser.userId,
            email: privyUser.email,
          });
        }

        if (!user) {
          console.error('[Auth] Failed to get or create user');
          return null;
        }

        return {
          id: user.id,
          privyUserId: privyUser.userId,
          email: user.email,
          walletAddress: user.wallet,
          isWhiteListed: user.isWhiteListed,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          isHidden: user.isHidden,
          needsLegacyLink: !user.wallet, // Flag for CTA
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial login
      if (user) {
        token.id = user.id;
        token.privyUserId = user.privyUserId;
        token.email = user.email;
        token.walletAddress = user.walletAddress;
        token.isWhiteListed = user.isWhiteListed;
        token.isAdmin = user.isAdmin;
        token.isSuperAdmin = user.isSuperAdmin;
        token.isHidden = user.isHidden;
        token.needsLegacyLink = user.needsLegacyLink;
        token.lastRefresh = Date.now();
      }

      // Refresh user data periodically (every 5 minutes)
      const shouldRefresh =
        trigger === 'update' ||
        !token.lastRefresh ||
        Date.now() - (token.lastRefresh as number) > 5 * 60 * 1000;

      if (shouldRefresh && token.privyUserId) {
        const dbUser = await getUserByPrivyId(token.privyUserId as string);
        if (dbUser) {
          token.walletAddress = dbUser.wallet;
          token.isWhiteListed = dbUser.isWhiteListed;
          token.isAdmin = dbUser.isAdmin;
          token.isSuperAdmin = dbUser.isSuperAdmin;
          token.isHidden = dbUser.isHidden;
          token.needsLegacyLink = !dbUser.wallet;
          token.lastRefresh = Date.now();
        }
      }

      return token;
    },

    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          privyUserId: token.privyUserId,
          email: token.email,
          walletAddress: token.walletAddress,
          isWhiteListed: token.isWhiteListed,
          isAdmin: token.isAdmin,
          isSuperAdmin: token.isSuperAdmin,
          isHidden: token.isHidden,
          needsLegacyLink: token.needsLegacyLink,
        },
      };
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/',
    error: '/',
  },
};
```

### 4.4 Update User Query Functions

**File:** `src/server/utils/queries/userQueries.ts`

Add new functions:

```typescript
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// Get user by Privy ID
export async function getUserByPrivyId(privyUserId: string) {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.privyUserId, privyUserId))
    .limit(1);
  return result[0] || null;
}

// Create user from Privy login
export async function createUserFromPrivy(data: {
  privyUserId: string;
  email?: string;
}) {
  const result = await db
    .insert(users)
    .values({
      privyUserId: data.privyUserId,
      email: data.email,
      isWhiteListed: false,
      isAdmin: false,
      isSuperAdmin: false,
      isHidden: false,
    })
    .returning();
  return result[0] || null;
}

// Update user with Privy ID (for legacy account linking)
export async function updateUserPrivyId(userId: string, privyUserId: string) {
  const result = await db
    .update(users)
    .set({
      privyUserId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .returning();
  return result[0] || null;
}

// Link wallet to user
export async function linkWalletToUser(userId: string, walletAddress: string) {
  const result = await db
    .update(users)
    .set({
      wallet: walletAddress.toLowerCase(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId))
    .returning();
  return result[0] || null;
}

// Merge accounts (legacy into current)
export async function mergeAccounts(
  currentUserId: string,
  legacyUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get both users
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUserId));

    const [legacyUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, legacyUserId));

    if (!currentUser || !legacyUser) {
      return { success: false, error: 'User not found' };
    }

    // Update legacy user with Privy ID and merged data
    await db
      .update(users)
      .set({
        privyUserId: currentUser.privyUserId,
        email: currentUser.email || legacyUser.email,
        acceptedUgcCount: (legacyUser.acceptedUgcCount || 0) +
                          (currentUser.acceptedUgcCount || 0),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, legacyUserId));

    // Update foreign keys: artists.addedBy
    await db.execute(sql`
      UPDATE artists
      SET added_by = ${legacyUserId}
      WHERE added_by = ${currentUserId}
    `);

    // Update foreign keys: ugcresearch.userId
    await db.execute(sql`
      UPDATE ugcresearch
      SET user_id = ${legacyUserId}
      WHERE user_id = ${currentUserId}
    `);

    // Delete the current (placeholder) user
    await db
      .delete(users)
      .where(eq(users.id, currentUserId));

    return { success: true };
  } catch (error) {
    console.error('[Merge] Account merge failed:', error);
    return { success: false, error: 'Merge failed' };
  }
}
```

---

## 5. Phase 4: Login UI Implementation

### 5.1 Create New Login Component

**File:** `src/app/_components/nav/components/Login.tsx` (replace existing)

```typescript
'use client';

import { usePrivy, useLogin } from '@privy-io/react-auth';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { LegacyAccountModal } from './LegacyAccountModal';

export default function Login() {
  const { ready, authenticated, user: privyUser, logout: privyLogout } = usePrivy();
  const { data: session, status } = useSession();
  const [showLegacyModal, setShowLegacyModal] = useState(false);
  const [hasShownModal, setHasShownModal] = useState(false);

  const { login } = useLogin({
    onComplete: async ({ user }) => {
      // Get the auth token and sign in with NextAuth
      const authToken = await user.getAuthToken();
      await signIn('privy', {
        authToken,
        redirect: false,
      });
    },
    onError: (error) => {
      console.error('[Login] Privy login error:', error);
    },
  });

  // Show legacy account modal for new users (once per session)
  useEffect(() => {
    if (
      session?.user?.needsLegacyLink &&
      !hasShownModal &&
      status === 'authenticated'
    ) {
      setShowLegacyModal(true);
      setHasShownModal(true);
    }
  }, [session?.user?.needsLegacyLink, hasShownModal, status]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    await privyLogout();
  };

  if (!ready) {
    return <Button disabled>Loading...</Button>;
  }

  if (status === 'authenticated' && session?.user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              {session.user.email || 'Account'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            {session.user.isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin">Admin Panel</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <LegacyAccountModal
          open={showLegacyModal}
          onClose={() => setShowLegacyModal(false)}
        />
      </>
    );
  }

  return (
    <Button onClick={login}>
      Log In
    </Button>
  );
}
```

### 5.2 Create Legacy Account Modal

**New File:** `src/app/_components/nav/components/LegacyAccountModal.tsx`

```typescript
'use client';

import { useLinkAccount } from '@privy-io/react-auth';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LegacyAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function LegacyAccountModal({ open, onClose }: LegacyAccountModalProps) {
  const { update: updateSession } = useSession();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { linkWallet } = useLinkAccount({
    onSuccess: async ({ user, linkedAccount }) => {
      if (linkedAccount.type === 'wallet') {
        // Call API to link wallet and potentially merge accounts
        try {
          const response = await fetch('/api/auth/link-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: linkedAccount.address
            }),
          });

          const result = await response.json();

          if (result.merged) {
            // Account was merged - refresh session
            await updateSession();
          }

          onClose();
        } catch (err) {
          setError('Failed to link wallet. Please try again.');
        }
      }
      setIsLinking(false);
    },
    onError: (error) => {
      console.error('[LinkWallet] Error:', error);
      setError('Failed to connect wallet. Please try again.');
      setIsLinking(false);
    },
  });

  const handleLinkWallet = () => {
    setIsLinking(true);
    setError(null);
    linkWallet();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome to Music Nerd!</DialogTitle>
          <DialogDescription>
            Have an existing Music Nerd wallet-based account? Connect your
            wallet to link your old account and restore your history.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLinking}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleLinkWallet}
            disabled={isLinking}
          >
            {isLinking ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 6. Phase 5: Legacy Account Migration Flow

### 6.1 Create Wallet Linking API Endpoint

**New File:** `src/app/api/auth/link-wallet/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/server/auth';
import {
  getUserByWallet,
  getUserByPrivyId,
  linkWalletToUser,
  mergeAccounts
} from '@/server/utils/queries/userQueries';

export async function POST(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user?.id || !session?.user?.privyUserId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  const { walletAddress } = await request.json();

  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return NextResponse.json(
      { error: 'Invalid wallet address' },
      { status: 400 }
    );
  }

  const normalizedWallet = walletAddress.toLowerCase();

  // Check if this wallet belongs to a legacy user
  const legacyUser = await getUserByWallet(normalizedWallet);

  if (legacyUser) {
    // Legacy user found - merge accounts
    if (legacyUser.privyUserId) {
      // Wallet already linked to another Privy account
      return NextResponse.json(
        { error: 'This wallet is already linked to another account' },
        { status: 409 }
      );
    }

    // Perform account merge
    const mergeResult = await mergeAccounts(session.user.id, legacyUser.id);

    if (!mergeResult.success) {
      return NextResponse.json(
        { error: mergeResult.error || 'Merge failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      merged: true,
      message: 'Account merged successfully! Your history has been restored.',
    });
  } else {
    // No legacy user - just link the wallet to current user
    await linkWalletToUser(session.user.id, normalizedWallet);

    return NextResponse.json({
      success: true,
      merged: false,
      message: 'Wallet linked successfully!',
    });
  }
}
```

### 6.2 Add Wallet Linking to Profile Page

**File:** `src/app/profile/page.tsx`

Add a section for legacy account recovery:

```typescript
// Add to profile page component
{!session?.user?.walletAddress && (
  <Card className="mt-6">
    <CardHeader>
      <CardTitle>Link Legacy Account</CardTitle>
      <CardDescription>
        Have an older Music Nerd wallet-based account? Connect your wallet
        to merge accounts and restore your history.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <WalletLinkButton />
    </CardContent>
  </Card>
)}
```

**New Component:** `src/app/profile/components/WalletLinkButton.tsx`

```typescript
'use client';

import { useLinkAccount } from '@privy-io/react-auth';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export function WalletLinkButton() {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);

  const { linkWallet } = useLinkAccount({
    onSuccess: async ({ linkedAccount }) => {
      if (linkedAccount.type === 'wallet') {
        try {
          const response = await fetch('/api/auth/link-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: linkedAccount.address
            }),
          });

          const result = await response.json();

          if (result.success) {
            toast({
              title: result.merged ? 'Account Merged!' : 'Wallet Linked!',
              description: result.message,
            });
            await updateSession();
          } else {
            toast({
              title: 'Error',
              description: result.error,
              variant: 'destructive',
            });
          }
        } catch (err) {
          toast({
            title: 'Error',
            description: 'Failed to link wallet. Please try again.',
            variant: 'destructive',
          });
        }
      }
      setIsLinking(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      });
      setIsLinking(false);
    },
  });

  return (
    <Button onClick={() => { setIsLinking(true); linkWallet(); }} disabled={isLinking}>
      {isLinking ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
```

---

## 7. Phase 6: Account Merge Logic

### 7.1 Merge Strategy

When merging accounts, the following rules apply:

| Field | Strategy |
|-------|----------|
| `id` | Keep legacy user ID (survives) |
| `privyUserId` | Copy from current user |
| `email` | Use current user's email (or legacy if current is null) |
| `wallet` | Keep legacy wallet |
| `acceptedUgcCount` | Sum both counts |
| `isAdmin` | Keep legacy value |
| `isWhiteListed` | Keep legacy value |
| `isSuperAdmin` | Keep legacy value |
| `isHidden` | Keep legacy value |
| `createdAt` | Keep legacy timestamp |

### 7.2 Foreign Key Updates

- `artists.addedBy` → Update to legacy user ID
- `ugcresearch.userId` → Update to legacy user ID
- Delete placeholder (current) user after merge

---

## 8. Phase 7: Remove Legacy Auth Packages

### 8.1 Remove Old Dependencies

```bash
npm uninstall @rainbow-me/rainbowkit @rainbow-me/rainbowkit-siwe-next-auth siwe wagmi viem ethers
```

### 8.2 Files to Delete

- `src/lib/authAdapter.tsx` (RainbowKit SIWE adapter)
- `src/app/_components/nav/components/LoginProviders.tsx` (Wagmi/RainbowKit providers)

### 8.3 Files to Update

Remove Web3-related imports and code from:
- `src/app/_components/Providers.tsx`
- `src/hooks/useEnsAvatar.ts` (if exists)
- Any components using `useAccount`, `useConnect` from wagmi

### 8.4 Update Package.json

Remove from dependencies:
```json
{
  "dependencies": {
    // REMOVE these:
    "@rainbow-me/rainbowkit": "^2.1.7",
    "@rainbow-me/rainbowkit-siwe-next-auth": "^0.4.1",
    "ethers": "^5.7.2",
    "siwe": "^2.3.2",
    "viem": "^2.30.5",
    "wagmi": "^2.18.1"
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**New Test File:** `src/__tests__/auth/privy-auth.test.ts`

```typescript
describe('Privy Authentication', () => {
  describe('Token Verification', () => {
    it('should verify valid Privy tokens');
    it('should reject invalid tokens');
    it('should handle expired tokens');
  });

  describe('User Creation', () => {
    it('should create new user from Privy login');
    it('should return existing user for known Privy ID');
  });

  describe('Account Linking', () => {
    it('should link wallet to user without legacy account');
    it('should merge accounts when legacy wallet found');
    it('should reject already-linked wallets');
  });

  describe('Account Merge', () => {
    it('should sum acceptedUgcCount');
    it('should update foreign keys');
    it('should delete placeholder account');
    it('should preserve legacy roles');
  });
});
```

### 9.2 Integration Tests

- [ ] Complete login flow with new email
- [ ] Complete login flow with existing email (returning user)
- [ ] Wallet linking for new user (no legacy account)
- [ ] Wallet linking with legacy account merge
- [ ] Skip CTA and link later from profile
- [ ] Session persistence and refresh
- [ ] Logout flow

### 9.3 Manual Testing Checklist

#### New User Flow
- [ ] Email login works
- [ ] User record created with `privy_user_id`
- [ ] Legacy account modal appears
- [ ] Dismissing modal works
- [ ] New user can add artists (if whitelisted)

#### Legacy User Recovery
- [ ] Legacy modal wallet connection works
- [ ] Correct legacy account found by wallet
- [ ] Accounts merged successfully
- [ ] Roles preserved after merge
- [ ] UGC counts summed correctly
- [ ] Added artists preserved

#### Profile Page Recovery
- [ ] Wallet link button shows for users without wallet
- [ ] Wallet linking from profile works
- [ ] Account merge from profile works

---

## 10. Rollback Plan

### 10.1 Database Rollback

```sql
-- Revert schema changes
ALTER TABLE users ALTER COLUMN wallet SET NOT NULL;
ALTER TABLE users DROP COLUMN privy_user_id;
```

### 10.2 Code Rollback

```bash
git checkout staging
git revert <merge-commit-hash>
```

### 10.3 Environment Variables

Remove Privy environment variables from staging/production.

---

## 11. File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `src/app/_components/PrivyProviderWrapper.tsx` | Privy SDK provider configuration |
| `src/server/utils/privy.ts` | Privy token verification utilities |
| `src/app/_components/nav/components/LegacyAccountModal.tsx` | Post-login wallet linking CTA |
| `src/app/api/auth/link-wallet/route.ts` | Wallet linking API endpoint |
| `src/app/profile/components/WalletLinkButton.tsx` | Profile page wallet link button |
| `src/__tests__/auth/privy-auth.test.ts` | Authentication tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/server/db/schema.ts` | Add `privyUserId`, make `wallet` nullable |
| `src/server/auth.ts` | Replace SIWE with Privy credentials provider |
| `src/server/utils/queries/userQueries.ts` | Add Privy-related queries |
| `src/app/_components/Providers.tsx` | Add PrivyProviderWrapper |
| `src/app/_components/nav/components/Login.tsx` | Replace with Privy login |
| `src/app/profile/page.tsx` | Add legacy account recovery section |
| `package.json` | Add Privy packages, remove Web3 packages |
| `.env.local` | Add Privy credentials |

### Deleted Files
| File | Reason |
|------|--------|
| `src/lib/authAdapter.tsx` | RainbowKit SIWE adapter no longer needed |
| `src/app/_components/nav/components/LoginProviders.tsx` | Wagmi/RainbowKit providers no longer needed |

---

## Deployment Checklist

### Staging Deployment
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Privy dashboard configured for staging URL
- [ ] Full integration testing completed
- [ ] Legacy account merge tested

### Production Deployment
- [ ] Database migration reviewed and approved
- [ ] Environment variables configured in production
- [ ] Privy dashboard configured for production URL
- [ ] Staged rollout (if possible)
- [ ] Monitor error rates and login success
- [ ] Communicate changes to users

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Email notifications on merge | No - silent merge |
| Duplicate account detection | Out of scope - ignore this edge case |
| Admin manual link/unlink | No - not needed |
| Migration analytics | None - no tracking required |

---

**Document End**
