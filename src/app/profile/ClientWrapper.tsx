"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";

type User = {
  id: string;
  wallet: string;
  email: string | null;
  username: string | null;
  isAdmin: boolean;
  isWhiteListed: boolean;
  isSuperAdmin: boolean;
  isHidden: boolean;
  acceptedUgcCount: number | null;
  createdAt: string;
  updatedAt: string;
  legacyId: string | null;
};

export default function ClientWrapper() {
  const { status, data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authTransition, setAuthTransition] = useState(false);

  // Handle authentication state changes gracefully
  useEffect(() => {
    console.debug('[Profile] Session state changed:', { 
      status, 
      sessionId: session?.user?.id, 
      isAuthenticated: status === 'authenticated' 
    });

    // Set transition flag during auth changes
    if ((status as string) === 'loading') {
      setAuthTransition(true);
      return;
    }

    // Clear transition flag when auth state settles
    if ((status as string) === 'authenticated' || (status as string) === 'unauthenticated') {
      setAuthTransition(false);
    }

    const fetchUser = async () => {
      if ((status as string) === "authenticated" && session?.user?.id) {
        try {
          console.debug('[Profile] Fetching user data for:', session.user.id);
          const response = await fetch(`/api/user/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            console.debug('[Profile] User data fetched successfully:', userData);
            setUser(userData);
          } else {
            console.error('[Profile] User fetch failed with status:', response.status);
            setUser(null);
          }
        } catch (error) {
          console.error('[Profile] Failed to fetch user:', error);
          setUser(null);
        }
      } else if ((status as string) === "unauthenticated") {
        console.debug('[Profile] User is unauthenticated, clearing user data');
        setUser(null);
      } else if ((status as string) === "loading") {
        console.debug('[Profile] Session is loading, keeping current user state');
        return; // Don't change user state while loading
      }
      setIsLoading(false);
    };

    // Only fetch user when auth state is settled
    if ((status as string) !== "loading") {
      fetchUser();
    }
  }, [status, session]);

  // Show loading during authentication transitions
  if ((status as string) === "loading" || authTransition) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">
            {(status as string) === "loading" ? "Checking authentication..." : "Updating..."}
          </div>
        </div>
      </div>
    );
  }

  // Show loading while fetching user data
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading profile...</div>
        </div>
      </div>
    );
  }

  // Guest user object
  const guestUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    wallet: '0x0000000000000000000000000000000000000000',
    email: null,
    username: 'Guest User',
    isAdmin: false,
    isWhiteListed: false,
    isSuperAdmin: false,
    isHidden: false,
    acceptedUgcCount: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    legacyId: null,
  };

  const currentUser = user || guestUser;

  console.debug('[Profile] Rendering with user:', {
    user,
    currentUser,
    status,
    sessionId: session?.user?.id,
    isAuthenticated: status === 'authenticated'
  });

  return (
    <>
      <Dashboard 
        user={currentUser} 
        showLeaderboard={false} 
        showDateRange={false} 
        allowEditUsername={true} 
      />
    </>
  );
}
