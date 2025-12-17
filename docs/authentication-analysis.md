# Authentication & Authorization System Analysis - MusicNerdWeb

## 🔐 Architecture Overview

MusicNerdWeb uses a **Web3-first authentication system** combining:
- **SIWE (Sign-In with Ethereum)** for wallet-based login
- **NextAuth.js** for session management
- **RainbowKit + Wagmi** for Web3 wallet integration
- **JWT tokens** for stateless sessions
- **Role-based access control** (Admin, Whitelist, Regular users)

---

## 🔄 Complete Authentication Flow

### Step-by-Step Process

1. **User clicks "Log In"** → RainbowKit modal opens
2. **Wallet Connection** → User selects wallet (MetaMask, WalletConnect, etc.)
3. **Nonce Generation** → Frontend requests CSRF token from NextAuth
4. **SIWE Message Creation** → System creates standardized message:
   ```
   Sign in to MusicNerd to add artists and manage your collection.
   Domain: musicnerd.com
   Nonce: [CSRF token]
   Expires: [5 minutes from now]
   ```
5. **User Signs Message** → Wallet prompts signature (no gas fees)
6. **Backend Verification** → SIWE library verifies cryptographic signature
7. **User Lookup/Creation**:
   - Existing user → Retrieves from database
   - New user → Creates record with wallet address
8. **JWT Creation** → NextAuth creates token with user ID + roles
9. **Session Established** → 30-day secure session cookie set

### SIWE Message Structure

```typescript
{
  domain: window.location.hostname,
  address: userAddress,
  statement: 'Sign in to MusicNerd to add artists and manage your collection.',
  uri: window.location.origin,
  version: '1',
  chainId: currentChainId,
  nonce: csrfToken,
  issuedAt: new Date().toISOString(),
  expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
}
```

---

## 👥 Role-Based Authorization

### User Roles (Database Schema)

| Role | Flag | Permissions |
|------|------|-------------|
| **Regular User** | Default | View content only |
| **Whitelisted** | `isWhiteListed: true` | Submit UGC, add artists, leaderboard access |
| **Admin** | `isAdmin: true` | All whitelist perms + admin dashboard, approve UGC, manage users |
| **Super Admin** | `isSuperAdmin: true` | Highest access level (reserved for future) |
| **Hidden** | `isHidden: true` | Hidden from leaderboards (keeps other perms) |

### Authorization Patterns

#### Server-Side Page Protection

```typescript
// src/app/admin/page.tsx
export default async function Admin() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    return <PleaseLoginPage text="Log in to access this page" />;
  }

  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    return <PleaseLoginPage text="You are not authorized to access this page" />;
  }

  // Render admin content
}
```

#### API Route Protection

```typescript
// src/app/api/admin/whitelist-user/[id]/route.ts
export async function PUT(request: NextRequest, { params }) {
  // Check authentication
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json(
      { status: "error", message: "Not authenticated" },
      { status: 401 }
    );
  }

  // Check authorization (admin role)
  const currentUser = await getUserById(session.user.id);
  if (!currentUser?.isAdmin) {
    return NextResponse.json(
      { status: "error", message: "Only admins can edit user roles" },
      { status: 403 }
    );
  }

  // Process request
}
```

#### Client-Side Conditional Rendering

```typescript
const { data: session } = useSession();

{session?.user?.isAdmin && (
  <DropdownMenuItem asChild>
    <Link href="/admin">Admin Panel</Link>
  </DropdownMenuItem>
)}
```

---

## 🔑 Key Files Reference

### Core Authentication Files

| File | Purpose |
|------|---------|
| `/src/server/auth.ts` | NextAuth configuration, SIWE verification, JWT/session callbacks |
| `/src/lib/authAdapter.tsx` | RainbowKit adapter for SIWE message creation and verification |
| `/src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route handler |
| `/src/server/utils/queries/userQueries.ts` | User database operations (CRUD, role management) |

### Web3 Integration Files

| File | Purpose |
|------|---------|
| `/src/app/_components/nav/components/LoginProviders.tsx` | Wagmi and RainbowKit provider setup |
| `/src/app/_components/nav/components/Login.tsx` | Login button component with wallet connection logic |
| `/src/app/_components/Providers.tsx` | SessionProvider wrapper for app |

### Authorization Files

| File | Purpose |
|------|---------|
| `/src/app/admin/page.tsx` | Admin dashboard with server-side auth check |
| `/src/app/api/admin/whitelist-user/[id]/route.ts` | Example of API route authorization |
| `/src/app/api/pendingUGCCount/route.ts` | Admin-only API endpoint |

### Database Schema

| File | Purpose |
|------|---------|
| `/src/server/db/schema.ts` | Drizzle ORM schema definition (users table with roles) |

---

## ⏱️ Session Management

### JWT Strategy

- **Type:** Stateless JWT tokens
- **Duration:** 30 days
- **Storage:** Secure HTTP-only cookies
- **Refresh Interval:** 5 minutes (automatic role sync)

### Automatic Role Refresh

The system automatically refreshes user roles every 5 minutes:

```typescript
// JWT callback in src/server/auth.ts
async jwt({ token, user, trigger }) {
  // Initial login
  if (user) {
    token.walletAddress = user.walletAddress;
    token.isWhiteListed = user.isWhiteListed;
    token.isAdmin = user.isAdmin;
    token.isSuperAdmin = user.isSuperAdmin;
    token.isHidden = user.isHidden;
    token.lastRefresh = Date.now();
  }

  // Check if refresh needed
  const shouldRefresh =
    trigger === "update" ||                          // Explicit update
    !token.lastRefresh ||                            // First time
    (Date.now() - token.lastRefresh) > 5 * 60 * 1000 || // >5 min old
    token.isAdmin === undefined;                     // Missing data

  if (shouldRefresh && token.walletAddress) {
    const user = await getUserByWallet(token.walletAddress);
    if (user) {
      // Update all role flags from database
      token.isWhiteListed = user.isWhiteListed;
      token.isAdmin = user.isAdmin;
      token.isSuperAdmin = user.isSuperAdmin;
      token.isHidden = user.isHidden;
      token.lastRefresh = Date.now();
    }
  }

  return token;
}
```

**Benefits:**
- Role changes propagate within 5 minutes (no logout required)
- Balances freshness with database load
- Admin can promote users without forcing re-login

### Cookie Configuration

**Production (HTTPS):**
```typescript
sessionToken: {
  name: '__Secure-next-auth.session-token',
  options: {
    httpOnly: true,      // Prevents XSS access
    sameSite: 'lax',     // CSRF protection
    path: '/',
    secure: true,        // HTTPS only
  }
}
```

**Development (HTTP):**
```typescript
sessionToken: {
  name: 'next-auth.session-token',
  options: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false,       // Allows HTTP localhost
  }
}
```

### Client-Side Session Handling

```typescript
import { useSession } from "next-auth/react";

const { data: session, status } = useSession();

// Status values: "loading" | "authenticated" | "unauthenticated"
if (status === "loading") return <Spinner />;
if (status === "unauthenticated") return <LoginPrompt />;

// Access user data
console.log(session.user.walletAddress);
console.log(session.user.isAdmin);
```

### Wallet Disconnect Synchronization

When user disconnects wallet in RainbowKit, session automatically logs out:

```typescript
// src/app/_components/nav/components/Login.tsx
useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null;

  // Detect wallet disconnect while authenticated
  if (!isConnected && status === "authenticated") {
    // Grace period to avoid false positives during reconnection
    timeoutId = setTimeout(() => {
      if (!isConnected) {
        signOut({ redirect: false }); // Silent logout
      }
    }, 1500);
  }

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [isConnected, status]);
```

---

## 🛡️ Security Measures

### ✅ Implemented Protections

| Security Feature | Implementation |
|-----------------|----------------|
| **CSRF Protection** | NextAuth built-in CSRF tokens used as SIWE nonce |
| **Signature Verification** | SIWE library validates wallet signatures cryptographically |
| **Message Expiration** | 5-minute expiration on SIWE messages |
| **Domain Verification** | Rejects signatures from different domains |
| **Wallet Validation** | Regex check: `/^0x[a-fA-F0-9]{40}$/` |
| **HttpOnly Cookies** | Prevents XSS token theft |
| **HTTPS Enforcement** | Production cookies require HTTPS |
| **SQL Injection Prevention** | Drizzle ORM with parameterized queries |
| **Replay Attack Prevention** | Nonce validation + message expiration |

### SIWE Verification Code

```typescript
// src/server/auth.ts - authorize callback
const siwe = new SiweMessage(JSON.parse(credentials.message));

// Normalize domains (remove ports)
const normalizedMessageDomain = siwe.domain.split(':')[0];
const normalizedAuthDomain = authUrl.hostname.split(':')[0];

// Verify domain matches
if (normalizedMessageDomain !== normalizedAuthDomain) {
  console.error("[Auth] Domain mismatch");
  return null;
}

// Extract nonce from CSRF token (format: "nonce|hash")
let nonce = csrfToken;
if (csrfToken.includes('|')) {
  nonce = csrfToken.split('|')[0];
}

// Verify signature
const result = await siwe.verify({
  signature: credentials.signature,
  domain: normalizedMessageDomain,
  nonce: nonce,
});

if (!result.success) {
  console.error("[Auth] SIWE verification failed");
  return null;
}

// Validate wallet address format
if (!siwe.address || !/^0x[a-fA-F0-9]{40}$/.test(siwe.address)) {
  console.error("[Auth] Invalid wallet address format");
  return null;
}
```

### CSRF Protection Details

**How it works:**
1. NextAuth automatically generates CSRF tokens on `/api/auth/csrf`
2. Token format: `nonce|hash` (pipe-separated)
3. Frontend uses full token in form submissions
4. Backend extracts nonce for SIWE verification
5. SIWE library validates nonce matches signed message

**Protection against:**
- Cross-site request forgery on authentication endpoints
- Replay attacks (nonce expires with SIWE message)

---

## 🎯 Special Features

### 1. Guest Mode (Development Only)

Allows local development without wallet setup:

```typescript
// src/server/auth.ts
if (process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true'
    && process.env.NODE_ENV !== 'production') {
  return {
    id: 'temp-' + Math.random(),
    walletAddress: null,
    name: 'Guest User',
    isWhiteListed: true, // Auto-whitelisted for testing
    isAdmin: false,
  };
}
```

**Security:** Double-check prevents accidental production bypass (requires BOTH env var AND dev mode)

### 2. ENS Avatar Support

Displays ENS avatars for users with ENS names:

```typescript
const { ensAvatar, jazziconSeed } = useEnsAvatar();

// Display priority: ENS Avatar > Jazzicon > Default
{ensAvatar ? (
  <img src={ensAvatar} alt="ENS Avatar" />
) : jazziconSeed ? (
  <Jazzicon diameter={32} seed={jazziconSeed} />
) : (
  <img src="/default_pfp_pink.png" alt="Default" />
)}
```

### 3. UGC Count Tracking with Notifications

```typescript
// Fetch pending UGC count for admins
const fetchPendingUGC = async () => {
  if (session?.user?.isAdmin) {
    const res = await fetch('/api/pendingUGCCount');
    const data = await res.json();
    setHasPendingUGC(data.count > 0); // Show red dot badge
  }
};

// Poll every 30 seconds
useEffect(() => {
  const interval = setInterval(fetchPendingUGC, 30000);
  return () => clearInterval(interval);
}, [session]);
```

### 4. Cross-Tab Session Sync

Uses custom events for cross-tab communication:

```typescript
// Dispatch events from one tab
window.dispatchEvent(new Event('pendingUGCUpdated'));
window.dispatchEvent(new Event('ugcCountUpdated'));

// Listen in other tabs
window.addEventListener('pendingUGCUpdated', fetchPendingUGC);
window.addEventListener('ugcCountUpdated', fetchUGCCount);
```

### 5. Authentication Retry Logic

Handles edge cases during first-time login:

```typescript
// src/lib/authAdapter.tsx
verify: async ({ message, signature }) => {
  const response = await signIn("credentials", {
    message: JSON.stringify(message),
    signature,
    redirect: false,
  });

  // Retry once on 401 (CSRF token timing issue on first login)
  if (response?.error?.includes('401')) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const retryResponse = await signIn("credentials", {
      message: JSON.stringify(message),
      signature,
      redirect: false,
    });

    return !retryResponse?.error;
  }

  return !response?.error;
}
```

---

## 📊 Database Schema

### Users Table

The `users` table is the foundation of the authentication system, storing user identities and authorization flags.

#### Schema Definition

```typescript
// src/server/db/schema.ts
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  wallet: text("wallet").notNull().unique(),
  email: text("email"),
  username: text("username"),
  isAdmin: boolean("isAdmin").default(false).notNull(),
  isWhiteListed: boolean("isWhiteListed").default(false).notNull(),
  isSuperAdmin: boolean("isSuperAdmin").default(false).notNull(),
  isHidden: boolean("isHidden").default(false).notNull(),
  isArtist: boolean("isArtist").default(false).notNull(),
  acceptedUgcCount: bigint("acceptedUgcCount", { mode: "number" }),
  legacyId: text("legacyId"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
```

#### Column Details

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | uuid_generate_v4() | Primary key - auto-generated UUID |
| `email` | text | YES | null | User email (optional, not currently used) |
| `username` | text | YES | null | Display name (optional, not currently used) |
| `wallet` | text | NO | - | Ethereum wallet address (unique identifier) |
| `created_at` | timestamp with time zone | NO | now() | UTC timestamp of account creation |
| `updated_at` | timestamp with time zone | NO | now() | UTC timestamp of last update |
| `legacy_id` | text | YES | null | Reference to old system ID (migration artifact) |
| `is_admin` | boolean | NO | false | Admin role flag - full access to admin dashboard |
| `is_white_listed` | boolean | NO | false | Whitelist flag - can submit UGC and add artists |
| `is_super_admin` | boolean | NO | false | Super admin flag - reserved for future use |
| `accepted_ugc_count` | bigint | YES | null | Cached count of approved UGC submissions |
| `is_artist` | boolean | NO | false | Artist flag - marks user as an artist |
| `is_hidden` | boolean | NO | false | Hidden flag - hides from leaderboards |

#### Indexes & Constraints

```sql
-- Primary Key
CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)

-- Unique wallet address index (prevents duplicate wallets)
CREATE UNIQUE INDEX users_wallet_key ON public.users USING btree (wallet)
```

#### Field Usage Notes

**Identity Fields:**
- `id`: Internal UUID used for all foreign key relationships
- `wallet`: External identifier - Ethereum address (0x prefixed, 40 hex chars)
- `email` & `username`: Currently unused, reserved for future social features

**Authorization Fields:**
- `is_admin`: Required for accessing `/admin` routes and management APIs
- `is_white_listed`: Required for submitting UGC and adding artists to database
- `is_super_admin`: Future-proofing for highest privilege tier (not currently enforced)
- `is_artist`: Flags verified artists (potential future use for artist profiles)
- `is_hidden`: Hides user from public leaderboards while maintaining other permissions

**Metadata Fields:**
- `created_at`: Tracks account age, set once on creation
- `updated_at`: Updated automatically via trigger (should update on any row change)
- `legacy_id`: Backward compatibility for data migration from previous system
- `accepted_ugc_count`: Denormalized count for leaderboard performance (avoids COUNT query)

#### Role Hierarchy

```
Regular User (all flags false)
    ↓
Whitelisted User (is_white_listed = true)
    ↓
Admin (is_admin = true, is_white_listed auto-true in app logic)
    ↓
Super Admin (is_super_admin = true) - Future use
```

**Auto-Promotion Logic:**
- When `is_admin = true`, app automatically treats user as whitelisted (no explicit flag needed)
- When `is_super_admin = true`, app should treat user as admin + whitelisted (if implemented)

#### Database Triggers

The `updated_at` field should update automatically via a PostgreSQL trigger:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now() AT TIME ZONE 'utc';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

*Note: Verify this trigger exists in your database migrations.*

#### Data Integrity

**Wallet Address Validation:**
- Format enforced in app: `/^0x[a-fA-F0-9]{40}$/`
- Database enforces uniqueness via `users_wallet_key` index
- Case-sensitive in database (lowercase recommended by EIP-55)

**UGC Count Sync:**
- `accepted_ugc_count` should stay in sync with actual approved UGC records
- Updated via app logic when UGC is approved/rejected
- Used for leaderboard ranking to avoid expensive JOIN queries

#### Foreign Key Relationships

The `users.id` field is referenced by:
- `artists.addedBy` - Tracks which user added an artist
- `ugcresearch.userId` - Links UGC submissions to submitter
- `ugcresearch.approvedBy` - Tracks which admin approved UGC (if applicable)

*See database schema for complete relationship definitions.*

---

## 🧪 Testing Coverage

### Test File Location
`/src/server/utils/__tests__/web3-auth.test.ts`

### Test Scenarios

✅ **Valid SIWE authentication flow**
- Complete wallet login process
- User creation on first login
- Session token generation

✅ **Invalid signature rejection**
- Malformed signatures
- Wrong domain signatures
- Expired messages

✅ **Guest mode authentication**
- Walletless mode in development
- Production bypass prevention

✅ **Session configuration**
- Production vs development cookie settings
- Secure flag enforcement
- Session timeout validation (30 days)

✅ **Error handling**
- Malformed SIWE messages
- Database connection failures
- Invalid wallet addresses

---

## 📝 Code Examples

### Complete Login Flow (Frontend + Backend)

**Frontend - User Interaction:**

```typescript
// src/app/_components/nav/components/Login.tsx
export default function Login() {
  const { openConnectModal } = useConnectModal();
  const shouldPromptRef = useRef(false);

  const handleLogin = () => {
    shouldPromptRef.current = true;
    openConnectModal(); // Opens RainbowKit modal
  };

  return <Button onClick={handleLogin}>Log In</Button>;
}
```

**AuthAdapter - SIWE Message Creation:**

```typescript
// src/lib/authAdapter.tsx
export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const token = await getCsrfToken();
    return token;
  },

  createMessage: ({ nonce, address, chainId }) => {
    return new SiweMessage({
      domain: window.location.hostname.split(':')[0],
      address,
      statement: 'Sign in to MusicNerd to add artists and manage your collection.',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  },

  verify: async ({ message, signature }) => {
    const response = await signIn("credentials", {
      message: JSON.stringify(message),
      signature,
      redirect: false,
    });
    return !response?.error;
  },
});
```

**Backend - Verification & User Creation:**

```typescript
// src/server/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        // Parse and verify SIWE message
        const siwe = new SiweMessage(JSON.parse(credentials.message));
        const result = await siwe.verify({
          signature: credentials.signature,
          domain: siwe.domain.split(':')[0],
          nonce: csrfToken.split('|')[0],
        });

        if (!result.success) return null;

        // Get or create user
        let user = await getUserByWallet(siwe.address);
        if (!user) {
          user = await createUser(siwe.address);
        }

        // Return user data for JWT
        return {
          id: user.id,
          walletAddress: user.wallet,
          isWhiteListed: user.isWhiteListed,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          isHidden: user.isHidden,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Store user data in JWT
        token.walletAddress = user.walletAddress;
        token.isAdmin = user.isAdmin;
        token.isWhiteListed = user.isWhiteListed;
        token.lastRefresh = Date.now();
      }
      return token;
    },

    async session({ session, token }) {
      // Copy token data to session
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          walletAddress: token.walletAddress,
          isAdmin: token.isAdmin,
          isWhiteListed: token.isWhiteListed,
        },
      };
    },
  },
};
```

### Protected API Route Example

```typescript
// src/app/api/admin/approve-ugc/route.ts
export async function POST(req: NextRequest) {
  // 1. Get server-side session
  const session = await getServerAuthSession();

  // 2. Check authentication
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  // 3. Check authorization (admin role)
  const user = await getUserById(session.user.id);
  if (!user?.isAdmin) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  // 4. Process admin action
  const { ugcId } = await req.json();
  await approveUGC(ugcId);

  return NextResponse.json({ success: true });
}
```

---

## 🎓 Key Takeaways

### Strengths

1. **Web3-Native Authentication**
   - No passwords to manage or store
   - Leverages wallet ownership for identity
   - Industry-standard SIWE protocol (EIP-4361)

2. **Stateless & Scalable**
   - JWT tokens eliminate session storage
   - No database lookup on every request
   - Horizontal scaling friendly

3. **Multi-Tier Access Control**
   - Flexible role system (regular, whitelist, admin, super admin)
   - Easy to extend with new roles
   - Auto-whitelisting for admins

4. **Automatic Role Sync**
   - 5-minute refresh keeps roles current
   - No forced logout when permissions change
   - Transparent to users

5. **Production-Ready Security**
   - HTTPS enforcement
   - HttpOnly secure cookies
   - CSRF protection
   - Domain verification
   - Message expiration
   - Replay attack prevention

6. **Developer-Friendly**
   - Guest mode for local development
   - Extensive debug logging
   - Comprehensive test coverage
   - Well-documented patterns

7. **Robust Error Handling**
   - Retry logic for edge cases
   - Graceful degradation
   - Clear error messages

### Architecture Decisions

**Why SIWE over traditional OAuth?**
- Aligns with Web3 ethos (self-sovereign identity)
- No dependency on centralized providers
- Users control their identity via wallet
- Cryptographic proof of ownership

**Why NextAuth.js?**
- Battle-tested session management
- Built-in CSRF protection
- Flexible callback system
- Great Next.js integration

**Why JWT over database sessions?**
- Reduced database load
- Better performance at scale
- Stateless architecture
- Easy to implement role refresh

**Why RainbowKit?**
- Best-in-class wallet UX
- Supports 100+ wallets
- Mobile-friendly
- Active maintenance

### Future Enhancements

**Potential improvements:**
- [ ] Multi-signature wallet support
- [ ] Social login fallback (email-based)
- [ ] Session activity logging
- [ ] 2FA for admin accounts
- [ ] Role-based rate limiting
- [ ] OAuth provider integration (optional)
- [ ] Delegated authentication (sign once, trust device)

---

## 📚 Resources

### Standards & Specifications

- [EIP-4361: Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)
- [Wagmi Documentation](https://wagmi.sh/)

### Security References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Web3 Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)

---

## 🔧 Maintenance Notes

### Common Operations

**Promoting a user to admin:**
```typescript
await db.update(users)
  .set({ isAdmin: true })
  .where(eq(users.wallet, walletAddress));
```

**Whitelisting a user:**
```typescript
await db.update(users)
  .set({ isWhiteListed: true })
  .where(eq(users.id, userId));
```

**Checking session validity:**
```typescript
const session = await getServerAuthSession();
console.log('Session valid:', !!session);
console.log('User ID:', session?.user?.id);
console.log('Roles:', {
  admin: session?.user?.isAdmin,
  whitelist: session?.user?.isWhiteListed,
});
```

### Debugging Tips

**Enable debug logging:**
```env
# .env.local
NEXTAUTH_DEBUG=true
```

**Check SIWE verification:**
- Look for `[Auth]` prefixed logs in server console
- Verify domain normalization (ports removed)
- Check nonce extraction from CSRF token
- Validate signature format

**Session troubleshooting:**
- Clear cookies if stale state persists
- Check `lastRefresh` timestamp in JWT
- Verify database user record matches session claims
- Test in incognito to rule out browser cache

---

**Document Version:** 1.0
**Last Updated:** 2025-11-03
**Maintainer:** Development Team
