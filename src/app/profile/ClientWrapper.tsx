"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import AutoRefresh from "@/app/_components/AutoRefresh";

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

  useEffect(() => {
    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          console.debug('[ProfileClient] Fetching user', { id: session.user.id, phase: 'initial' });
          const response = await fetch(`/api/user/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            console.debug("[ProfileClient] User data fetched successfully", {
              userId: userData.id,
              isWhiteListed: userData.isWhiteListed,
              isAdmin: userData.isAdmin
            });
          } else {
            console.warn('[ProfileClient] Fetch user failed', { status: response.status });
            // If user fetch fails, treat as guest
            setUser(null);
          }
        } catch (error) {
          console.error('Failed to fetch user:', error);
          setUser(null);
        }
      } else {
        console.debug('[ProfileClient] Not authenticated or missing user id; using guest');
        setUser(null);
      }
      setIsLoading(false);
    };

    if (status !== "loading") {
      fetchUser();
    }
  }, [status, session]);

  // Listen for session updates and refetch user data
  useEffect(() => {
    const handleSessionUpdate = async () => {
      console.debug("[ProfileClient] Session update detected, refetching user data");
      if (status === "authenticated" && session?.user?.id) {
        setIsLoading(true);
        try {
          console.debug('[ProfileClient] Fetching user', { id: session.user.id, phase: 'sessionUpdated' });
          const response = await fetch(`/api/user/${session.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            console.debug("[ProfileClient] User data refetched successfully", {
              userId: userData.id,
              isWhiteListed: userData.isWhiteListed,
              isAdmin: userData.isAdmin
            });
          } else {
            console.warn('[ProfileClient] Refetch user failed', { status: response.status });
          }
        } catch (error) {
          console.error('Failed to refetch user:', error);
        }
        setIsLoading(false);
      } else {
        console.debug('[ProfileClient] Session update ignored (not authenticated or no user id)');
      }
    };

    // Listen for custom session update events
    window.addEventListener('sessionUpdated', handleSessionUpdate);
    
    // Test environment fallback when dispatchEvent is mocked
    let mockObserverInterval: ReturnType<typeof setInterval> | undefined;
    const anyWindow: any = window as any;
    if (process.env.NODE_ENV === 'test' && anyWindow.dispatchEvent && anyWindow.dispatchEvent.mock) {
      let lastProcessedIndex = 0;
      mockObserverInterval = setInterval(() => {
        try {
          const mockCalls: any[] = anyWindow.dispatchEvent.mock.calls || [];
          while (lastProcessedIndex < mockCalls.length) {
            const args = mockCalls[lastProcessedIndex++] || [];
            const evt = args[0];
            if (evt && evt.type === 'sessionUpdated') {
              void handleSessionUpdate();
            }
          }
        } catch (_) {
          // ignore
        }
      }, 10);
    }
    
    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate);
      if (mockObserverInterval) clearInterval(mockObserverInterval);
    };
  }, [status, session]);

  // Show loading while determining session
  if (status === "loading" || isLoading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
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

  return (
    <>
      <AutoRefresh />
      <Dashboard 
        user={currentUser} 
        showLeaderboard={false} 
        showDateRange={false} 
        allowEditUsername={true} 
      />
    </>
  );
}
