"use client";

import { useSession } from "next-auth/react";
import { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { EditModeProvider } from "@/app/_components/EditModeContext";

// Context to share session and canEdit state with child components
interface SessionContextType {
  session: ReturnType<typeof useSession>['data'];
  canEdit: boolean;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  canEdit: false,
  isLoading: true,
});

// Hook to access session context
export function useSessionContext() {
  return useContext(SessionContext);
}

interface ClientSessionWrapperProps {
  children: ReactNode;
}

export default function ClientSessionWrapper({
  children,
}: ClientSessionWrapperProps) {
  const { data: session, status } = useSession();
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine canEdit - check if user is admin (maintains current behavior)
  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (session?.user?.id) {
      // Fetch user to check admin status (same logic as server-side)
      fetch(`/api/user/${session.user.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user');
          }
          return res.json();
        })
        .then(user => {
          setCanEdit(user?.isAdmin ?? false);
        })
        .catch((error) => {
          console.error('[ClientSessionWrapper] Error fetching user:', error);
          setCanEdit(false);
        });
    } else {
      // Check for walletless mode (same as server-side logic)
      const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && 
                                 process.env.NODE_ENV !== 'production';
      setCanEdit(walletlessEnabled);
    }
  }, [session, status]);

  return (
    <SessionContext.Provider value={{ session, canEdit, isLoading }}>
      <EditModeProvider canEdit={canEdit}>
        {children}
      </EditModeProvider>
    </SessionContext.Provider>
  );
}

