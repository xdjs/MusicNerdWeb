import { useSession } from "next-auth/react";
import { useMemo } from "react";

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: any;
  user: any;
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
