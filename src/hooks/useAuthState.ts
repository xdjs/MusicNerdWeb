import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { Session } from "next-auth";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: Session["user"] | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
}

export function useAuthState(): AuthState {
  const { data: session, status } = useSession();

  const authState = useMemo(() => {
    const isLoading = status === "loading";
    const isAuthenticated = status === "authenticated" && !!session?.user;
    
    return {
      isAuthenticated,
      isLoading,
      session,
      user: session?.user || null,
      isAdmin: session?.user?.isAdmin || false,
      isWhiteListed: session?.user?.isWhiteListed || false,
      isSuperAdmin: session?.user?.isSuperAdmin || false,
      isHidden: session?.user?.isHidden || false,
    };
  }, [session, status]);

  return authState;
}
