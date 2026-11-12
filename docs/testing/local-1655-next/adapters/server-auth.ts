import { session } from "./session";
export interface Session {
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
export const getServerAuthSession = async (): Promise<Session | null> =>
  session;
export const authOptions = {};
