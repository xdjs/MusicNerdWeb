import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { cookies } from 'next/headers';
import { NEXTAUTH_URL } from "@/env";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { getUserByWallet, createUser } from "@/server/utils/queries/userQueries";
import { normalizeAddress } from "@/lib/addressUtils";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      walletAddress?: string;
      isWhiteListed?: boolean;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      isHidden?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    walletAddress: string;
    email?: string;
    username?: string;
    location?: string;
    businessName?: string;
    image?: string;
    name?: string;
    isSignupComplete: boolean;
    isWhiteListed?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isHidden?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    walletAddress?: string;
    isWhiteListed?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isHidden?: boolean;
    lastRefresh?: number;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Copy all user properties to the token during initial login
        token.walletAddress = user.walletAddress;
        token.email = user.email;
        token.name = user.name || user.username;
        token.isWhiteListed = user.isWhiteListed;
        token.isAdmin = user.isAdmin;
        token.isSuperAdmin = user.isSuperAdmin;
        token.isHidden = user.isHidden;
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

        if (shouldRefresh && token.walletAddress) {
          try {
            console.debug('[Auth] Refreshing user data from database', { 
              trigger, 
              lastRefresh: token.lastRefresh ? new Date(token.lastRefresh as number).toISOString() : 'never',
              wallet: token.walletAddress 
            });
            
            const refreshedUser = await getUserByWallet(token.walletAddress);
            if (refreshedUser) {
              // Update all user properties from database
              token.isWhiteListed = refreshedUser.isWhiteListed;
              token.isAdmin = refreshedUser.isAdmin;
              token.isSuperAdmin = refreshedUser.isSuperAdmin;
              token.isHidden = refreshedUser.isHidden;
              token.email = refreshedUser.email;
              token.name = refreshedUser.username;
              token.lastRefresh = Date.now();
              
              console.debug('[Auth] User data refreshed', {
                isAdmin: refreshedUser.isAdmin,
                isWhiteListed: refreshedUser.isWhiteListed,
                isSuperAdmin: refreshedUser.isSuperAdmin,
                isHidden: refreshedUser.isHidden,
                userId: refreshedUser.id
              });
            }
          } catch (error) {
            console.error('[Auth] Error refreshing user data in JWT callback:', error);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
          walletAddress: token.walletAddress,
          email: token.email,
          name: token.name,
          isWhiteListed: token.isWhiteListed,
          isAdmin: token.isAdmin,
          isSuperAdmin: token.isSuperAdmin,
          isHidden: token.isHidden,
        },
      }
    },
    async redirect({ url, baseUrl }) {
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
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Ethereum",
      credentials: {
        message: {
          label: "Message",
          type: "text",
          placeholder: "0x0",
        },
        signature: {
          label: "Signature",
          type: "text",
          placeholder: "0x0",
        },
      },
      async authorize(credentials): Promise<any> {
        try {
          console.debug("[Auth] Starting authorization");
          
          // Check if wallet requirement is disabled
          if (process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true') {
            // Create or get a temporary user without wallet, but make them whitelisted
            const tempUserId = 'temp-' + Math.random().toString(36).substring(2);
            return {
              id: tempUserId,
              walletAddress: null,
              email: null,
              name: 'Guest User',
              username: 'guest',
              isSignupComplete: true,
              isWhiteListed: true, // Make temporary user whitelisted
              isAdmin: false,
              isSuperAdmin: false,
              isHidden: false,
            };
          }

          const siwe = new SiweMessage(JSON.parse(credentials?.message || "{}"));
          const authUrl = new URL(NEXTAUTH_URL);
          
          console.debug("[Auth] Verifying SIWE message", {
            address: siwe.address,
            domain: siwe.domain,
            expectedDomain: authUrl.hostname
          });

          // Normalize domains by removing port numbers if present
          const normalizedMessageDomain = siwe.domain.split(':')[0];
          const normalizedAuthDomain = authUrl.hostname.split(':')[0];

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: normalizedMessageDomain,
            nonce: cookies().get('next-auth.csrf-token')?.value.split('|')[0],
          });

          console.debug("[Auth] SIWE verification result", {
            success: result.success,
            error: result.error,
            normalizedMessageDomain,
            normalizedAuthDomain
          });

          if (!result.success) {
            console.error("[Auth] SIWE verification failed:", {
              error: result.error,
              messageDomain: siwe.domain,
              expectedDomain: authUrl.hostname
            });
            return null;
          }

          // Normalize the address to ensure consistent lookups and storage
          const normalizedAddress = normalizeAddress(siwe.address);
          if (!normalizedAddress) {
            console.error("[Auth] Invalid wallet address format:", siwe.address);
            return null;
          }

          let user = await getUserByWallet(normalizedAddress);
          if (!user) {
            console.debug("[Auth] Creating new user for wallet");
            user = await createUser(normalizedAddress);
          }

          console.debug("[Auth] Returning user", { id: user.id });
          
          // Map the database user to the NextAuth user format
          return {
            id: user.id,
            walletAddress: user.wallet, // Map wallet to walletAddress
            email: user.email,
            name: user.username,
            username: user.username,
            isSignupComplete: true,
            isWhiteListed: user.isWhiteListed, // Include whitelist status from database
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
            isHidden: user.isHidden,
          };
        } catch (e) {
          console.error("[Auth] Error during authorization:", e);
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
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
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
export const getServerAuthSession = () => getServerSession(authOptions);
