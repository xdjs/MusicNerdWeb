import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyPrivyToken } from './utils/privy';
import {
  getUserByPrivyId,
  createUserFromPrivy,
  getUserById,
} from './utils/queries/userQueries';

// Token version to invalidate legacy Web3 tokens
const CURRENT_TOKEN_VERSION = 2;

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      privyUserId: string;
      email?: string | null;
      walletAddress?: string | null;
      isWhiteListed: boolean;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      isHidden: boolean;
      needsLegacyLink: boolean;
    };
  }

  interface User {
    id: string;
    privyUserId: string;
    email?: string | null;
    walletAddress?: string | null;
    isWhiteListed: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isHidden: boolean;
    needsLegacyLink: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    privyUserId: string;
    email?: string | null;
    walletAddress?: string | null;
    isWhiteListed: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isHidden: boolean;
    needsLegacyLink: boolean;
    tokenVersion: number;
    lastRefresh: number;
    expired?: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'privy',
      name: 'Privy',
      credentials: {
        authToken: { label: 'Auth Token', type: 'text' },
      },
      async authorize(credentials) {
        console.log('[Auth] ========== AUTHORIZE CALLED ==========');
        console.log('[Auth] Credentials received:', credentials ? 'yes' : 'no');
        console.log('[Auth] Auth token present:', credentials?.authToken ? `${credentials.authToken.substring(0, 20)}...` : 'no');

        if (!credentials?.authToken) {
          console.error('[Auth] No auth token provided');
          return null;
        }

        // Verify Privy token
        console.log('[Auth] Verifying Privy token...');
        const privyUser = await verifyPrivyToken(credentials.authToken);
        console.log('[Auth] Privy verification result:', privyUser ? JSON.stringify(privyUser) : 'null');

        if (!privyUser) {
          console.error('[Auth] Privy token verification failed');
          return null;
        }

        // Look up user by Privy ID
        console.log('[Auth] Looking up user by Privy ID:', privyUser.userId);
        let user = await getUserByPrivyId(privyUser.userId);
        console.log('[Auth] getUserByPrivyId result:', user ? JSON.stringify({ id: user.id, privyUserId: user.privyUserId }) : 'null');

        if (!user) {
          // New user - create account
          console.log('[Auth] Creating new user for Privy ID:', privyUser.userId);
          console.log('[Auth] User data:', { email: privyUser.email, wallets: privyUser.linkedWallets });

          user = await createUserFromPrivy({
            privyUserId: privyUser.userId,
            email: privyUser.email,
          });

          if (!user) {
            console.error('[Auth] createUserFromPrivy returned null - user creation failed');
            console.error('[Auth] This is likely a database issue. Check if privy_user_id column exists.');
          }
        }

        if (!user) {
          console.error('[Auth] Failed to get or create user for Privy ID:', privyUser.userId);
          return null;
        }

        console.log('[Auth] User authenticated:', {
          id: user.id,
          privyUserId: privyUser.userId,
          hasWallet: !!user.wallet,
        });

        return {
          id: user.id,
          privyUserId: privyUser.userId,
          email: user.email,
          walletAddress: user.wallet,
          isWhiteListed: user.isWhiteListed,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          isHidden: user.isHidden,
          needsLegacyLink: !user.wallet, // Show CTA if no wallet linked
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      // CRITICAL: Invalidate legacy Web3 tokens
      // Legacy tokens have walletAddress but no privyUserId
      if (token.walletAddress && !token.privyUserId) {
        console.log('[Auth] Invalidating legacy Web3 token');
        return { expired: true } as any;
      }

      // Check token version - invalidate old tokens
      if (token.tokenVersion !== CURRENT_TOKEN_VERSION && !user) {
        console.log('[Auth] Invalidating token with old version');
        return { expired: true } as any;
      }

      // Initial sign in - set all fields
      if (user) {
        token.tokenVersion = CURRENT_TOKEN_VERSION;
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

      // 5-minute role refresh from database
      const shouldRefresh =
        trigger === 'update' ||
        !token.lastRefresh ||
        Date.now() - token.lastRefresh > 5 * 60 * 1000;

      if (shouldRefresh && token.id) {
        const dbUser = await getUserById(token.id);
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
      // Return null session for expired/legacy tokens
      if (token.expired) {
        return null as any; // Forces client to show logged-out state
      }

      return {
        ...session,
        user: {
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

  debug: process.env.NODE_ENV === 'development',
};

export async function getServerAuthSession() {
  return await getServerSession(authOptions);
}
