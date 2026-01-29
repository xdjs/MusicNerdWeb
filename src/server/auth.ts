import NextAuth, { getServerSession } from "next-auth/next";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByPrivyId, createUserFromPrivy, getUserByWallet } from "@/server/utils/queries/userQueries";
import { verifyPrivyToken } from "@/server/utils/privy";

// Lock to prevent concurrent session refresh operations
const refreshLocks = new Map<string, Promise<void>>();

// Define session user type for better type safety
interface SessionUser {
  id: string;
  privyUserId?: string;
  walletAddress?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  isWhiteListed?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isHidden?: boolean;
  needsLegacyLink?: boolean;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions = {
  callbacks: {
    async jwt({ token, user, trigger }: { token: JWT; user?: any; trigger?: "signIn" | "signUp" | "update" }) {
      if (user) {
        // Copy all user properties to the token during initial login
        token.privyUserId = user.privyUserId;
        token.walletAddress = user.walletAddress;
        token.email = user.email;
        token.name = user.name || user.username;
        token.isWhiteListed = user.isWhiteListed;
        token.isAdmin = user.isAdmin;
        token.isSuperAdmin = user.isSuperAdmin;
        token.isHidden = user.isHidden;
        token.needsLegacyLink = user.needsLegacyLink;
        token.lastRefresh = Date.now();
      } else {
        // Refresh user data from database in these cases:
        // 1. Explicit session update trigger
        // 2. Token is older than 5 minutes (for role changes)
        // 3. Missing critical properties
        const shouldRefresh =
          trigger === "update" ||
          !token.lastRefresh ||
          (Date.now() - (token.lastRefresh as number)) > 5 * 60 * 1000 || // 5 minutes
          token.isAdmin === undefined ||
          token.isWhiteListed === undefined ||
          token.isSuperAdmin === undefined ||
          token.isHidden === undefined;

        if (shouldRefresh && token.sub) {
          // Use a lock to prevent concurrent refresh operations for the same user
          const lockKey = token.sub;

          // If a refresh is already in progress, skip this one and return current token.
          // This is intentional: returning slightly stale data (up to 5 min) is acceptable
          // for role checks, and prevents thundering herd on concurrent requests.
          // Critical auth checks use real-time DB lookups, not cached session data.
          if (refreshLocks.has(lockKey)) {
            // Return current token while another refresh is in progress
          } else {
            // Create a new refresh operation with a lock
            const refreshOperation = (async () => {
              try {
                // Try to refresh by Privy ID first, then by wallet
                let refreshedUser = null;

                if (token.privyUserId) {
                  refreshedUser = await getUserByPrivyId(token.privyUserId);
                } else if (token.walletAddress) {
                  refreshedUser = await getUserByWallet(token.walletAddress);
                }

                if (refreshedUser) {
                  // Update all user properties from database
                  token.walletAddress = refreshedUser.wallet ?? undefined;
                  token.isWhiteListed = refreshedUser.isWhiteListed;
                  token.isAdmin = refreshedUser.isAdmin;
                  token.isSuperAdmin = refreshedUser.isSuperAdmin;
                  token.isHidden = refreshedUser.isHidden;
                  token.email = refreshedUser.email ?? undefined;
                  token.name = refreshedUser.username ?? undefined;
                  token.needsLegacyLink = !refreshedUser.wallet;
                  token.lastRefresh = Date.now();
                }
              } catch (error) {
                console.error('[Auth] Error refreshing user data in JWT callback:', error);
              }
            })();

            refreshLocks.set(lockKey, refreshOperation);
            try {
              await refreshOperation;
            } finally {
              refreshLocks.delete(lockKey);
            }
          }
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          privyUserId: token.privyUserId,
          walletAddress: token.walletAddress,
          email: token.email,
          name: token.name,
          isWhiteListed: token.isWhiteListed,
          isAdmin: token.isAdmin,
          isSuperAdmin: token.isSuperAdmin,
          isHidden: token.isHidden,
          needsLegacyLink: token.needsLegacyLink,
        },
      }
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow URLs from same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Privy authentication provider (email-first)
    CredentialsProvider({
      id: "privy",
      name: "Privy",
      credentials: {
        authToken: { label: "Auth Token", type: "text" },
      },
      async authorize(credentials): Promise<any> {
        try {
          if (!credentials?.authToken) {
            console.error('[Auth] No Privy auth token provided');
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Privy authorize called with token length:', credentials.authToken.length);
          }

          // Verify the Privy token
          const privyUser = await verifyPrivyToken(credentials.authToken);
          if (!privyUser) {
            console.error('[Auth] Privy token verification failed');
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Privy token verified successfully', {
              userId: privyUser.userId,
              email: privyUser.email,
            });
          }

          // Look up user by Privy ID
          let user = await getUserByPrivyId(privyUser.userId);
          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] getUserByPrivyId result:', user ? { id: user.id, email: user.email } : 'not found');
          }

          if (!user) {
            // New user - create account
            if (process.env.NODE_ENV === 'development') {
              console.log('[Auth] Creating new user from Privy login', {
                privyUserId: privyUser.userId,
                email: privyUser.email
              });
            }
            try {
              user = await createUserFromPrivy({
                privyUserId: privyUser.userId,
                email: privyUser.email,
              });
              if (process.env.NODE_ENV === 'development') {
                console.log('[Auth] User created successfully', { id: user?.id, privyUserId: user?.privyUserId });
              }
            } catch (createError) {
              console.error('[Auth] Failed to create user from Privy:', createError);
              return null;
            }
          }

          if (!user) {
            console.error('[Auth] Failed to get or create user');
            return null;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[Auth] Privy login successful', { userId: user.id, privyUserId: user.privyUserId });
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
            isSignupComplete: true,
            needsLegacyLink: !user.wallet,
          };
        } catch (error) {
          console.error('[Auth] Privy authorize error:', error);
          return null;
        }
      },
    }),
  ],
  // Enable debug mode only in development
  debug: process.env.NODE_ENV === "development",
  // Add CSRF protection
  secret: process.env.NEXTAUTH_SECRET,
  // Add secure cookies in production
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = (): Promise<Session | null> => getServerSession(authOptions) as Promise<Session | null>;
