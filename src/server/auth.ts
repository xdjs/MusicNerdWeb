import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { cookies } from 'next/headers';
import { NEXTAUTH_URL, NEXTAUTH_SECRET } from "@/env";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";
import { getUserByWallet, createUser } from "@/server/utils/queries/userQueries";

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
        token.id = user.id; // Ensure user ID is set
        token.sub = user.id; // Also set sub for compatibility
        token.walletAddress = user.walletAddress;
        token.email = user.email;
        token.name = user.name || user.username;
        token.isWhiteListed = user.isWhiteListed;
        token.isAdmin = user.isAdmin;
        token.isSuperAdmin = user.isSuperAdmin;
        token.isHidden = user.isHidden;
        token.lastRefresh = Date.now();
        
        console.debug('[Auth] JWT token created for user', {
          userId: user.id,
          walletAddress: user.walletAddress,
          isWhiteListed: user.isWhiteListed
        });
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
              token.id = refreshedUser.id; // Ensure user ID is maintained
              token.sub = refreshedUser.id; // Also set sub for compatibility
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
          id: token.sub || token.id, // Use token.id as fallback if token.sub is not set
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
          console.debug("[Auth] Starting authorization", {
            hasMessage: !!credentials?.message,
            hasSignature: !!credentials?.signature,
            messageLength: credentials?.message?.length || 0
          });
          
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

          // Get CSRF token with proper error handling
          const csrfToken = cookies().get('next-auth.csrf-token')?.value;
          console.debug("[Auth] CSRF token from cookies:", {
            hasToken: !!csrfToken,
            tokenLength: csrfToken?.length || 0,
            tokenValue: csrfToken ? csrfToken.substring(0, 20) + '...' : 'none'
          });
          
          if (!csrfToken) {
            console.error("[Auth] CSRF token not found in cookies");
            return null;
          }

          // Extract nonce from CSRF token - handle both formats
          let nonce = csrfToken;
          if (csrfToken.includes('|')) {
            nonce = csrfToken.split('|')[0];
            console.debug("[Auth] Extracted nonce from pipe-separated token");
          } else {
            console.debug("[Auth] Using full token as nonce");
          }

          console.debug("[Auth] Using nonce for SIWE verification:", nonce);

          const result = await siwe.verify({
            signature: credentials?.signature || "",
            domain: normalizedMessageDomain,
            nonce: nonce,
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

          // Validate the address format
          if (!siwe.address || !/^0x[a-fA-F0-9]{40}$/.test(siwe.address)) {
            console.error("[Auth] Invalid wallet address format:", siwe.address);
            return null;
          }

          let user = await getUserByWallet(siwe.address);
          if (!user) {
            console.debug("[Auth] Creating new user for wallet");
            user = await createUser(siwe.address);
          }

          console.debug("[Auth] Returning user", { id: user.id });
          
          // Map the database user to the NextAuth user format
          const nextAuthUser = {
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
          
          console.debug("[Auth] Returning NextAuth user object", {
            id: nextAuthUser.id,
            walletAddress: nextAuthUser.walletAddress,
            isWhiteListed: nextAuthUser.isWhiteListed,
            isAdmin: nextAuthUser.isAdmin
          });
          
          return nextAuthUser;
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
  secret: NEXTAUTH_SECRET,
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
