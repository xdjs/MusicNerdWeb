import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
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
    };
    expires: string;
  }

  interface User {
    id: string;
    privyUserId?: string;
    walletAddress?: string;
    email?: string;
    username?: string;
    location?: string;
    businessName?: string;
    image?: string;
    name?: string;
    isSignupComplete?: boolean;
    isWhiteListed?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isHidden?: boolean;
    needsLegacyLink?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    privyUserId?: string;
    walletAddress?: string;
    isWhiteListed?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    isHidden?: boolean;
    needsLegacyLink?: boolean;
    lastRefresh?: number;
  }
}
