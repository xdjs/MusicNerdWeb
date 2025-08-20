"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Dashboard from "@/app/profile/Dashboard";
import Leaderboard from "@/app/profile/Leaderboard";

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
  const [authTransitioning, setAuthTransitioning] = useState(false);

  // Handle authentication transition
  useEffect(() => {
    if (status === 'loading') {
      setAuthTransitioning(true);
    } else if (status === 'authenticated' && authTransitioning) {
      // Show loading for a bit longer to ensure smooth transition
      const timer = setTimeout(() => {
        window.location.reload();
      }, 500);
      return () => clearTimeout(timer);
    } else if (status === 'unauthenticated') {
      setAuthTransitioning(false);
    }
  }, [status, authTransitioning]);

  useEffect(() => {
    const fetchUser = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          console.debug('[Leaderboard] Fetching user data for:', session.user.id);
          
          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(`/api/user/${session.user.id}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const userData = await response.json();
            console.debug('[Leaderboard] User data fetched successfully:', userData);
            setUser(userData);
          } else {
            console.error('[Leaderboard] User fetch failed with status:', response.status);
            // If user fetch fails, treat as guest
            setUser(null);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.error('[Leaderboard] User fetch timed out');
          } else {
            console.error('[Leaderboard] Failed to fetch user:', error);
          }
          setUser(null);
        }
      } else {
        console.debug('[Leaderboard] No authenticated session, setting user to null');
        setUser(null);
      }
      setIsLoading(false);
    };

    if (status !== "loading") {
      fetchUser();
    }
  }, [status, session]);

  // Show loading while session is loading or during auth transition
  if (status === "loading" || authTransitioning) {
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
    <main className="px-5 sm:px-10 py-10">
      <Dashboard 
        user={currentUser} 
        allowEditUsername={false} 
        showLeaderboard={false} 
        showDateRange={false} 
        hideLogin={true} 
        showStatus={false} 
      />
      <Leaderboard highlightIdentifier={currentUser.id === '00000000-0000-0000-0000-000000000000' ? undefined : (currentUser.username || currentUser.wallet)} />
    </main>
  );
}
