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
  const [sessionStable, setSessionStable] = useState(false);


  // Handle authentication state changes and hard refresh
  useEffect(() => {
    console.debug('[Leaderboard] Session state changed:', { status, sessionId: session?.user?.id, isAuthenticated: status === 'authenticated' });
    
    // Check for authentication state transitions that require hard refresh
    const wasLoggedOut = sessionStorage.getItem('wasLoggedOut');
    const postLoginRefresh = sessionStorage.getItem('postLoginRefresh');
    const hasRefreshed = sessionStorage.getItem('leaderboardRefreshed');
    
    // Only trigger refresh if we haven't already refreshed for this session
    if (status === "authenticated" && session?.user?.id && (wasLoggedOut || !postLoginRefresh) && !hasRefreshed) {
      console.debug('[Leaderboard] Detected authentication state change, triggering hard refresh', {
        wasLoggedOut: !!wasLoggedOut,
        postLoginRefresh: !!postLoginRefresh,
        hasRefreshed: !!hasRefreshed,
        sessionId: session?.user?.id
      });
      
      // Set refresh flags and clear logout flag
      sessionStorage.setItem('postLoginRefresh', 'true');
      sessionStorage.setItem('leaderboardRefreshed', 'true');
      sessionStorage.removeItem('wasLoggedOut');
      
      // Force hard refresh with longer delay to ensure session is stable
      console.debug('[Leaderboard] Executing hard refresh');
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
      return;
    }
    
    // Additional check for login without wasLoggedOut flag
    if (status === "authenticated" && session?.user?.id && !postLoginRefresh && !hasRefreshed) {
      console.debug('[Leaderboard] Detected fresh login, triggering hard refresh', {
        sessionId: session?.user?.id
      });
      
      // Set refresh flags
      sessionStorage.setItem('postLoginRefresh', 'true');
      sessionStorage.setItem('leaderboardRefreshed', 'true');
      
      // Force hard refresh with longer delay
      console.debug('[Leaderboard] Executing hard refresh for fresh login');
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
      return;
    }
    
    // Handle logout - immediate refresh to clear state
    if (status === "unauthenticated" && hasRefreshed) {
      console.debug('[Leaderboard] Detected logout, triggering immediate refresh');
      sessionStorage.removeItem('leaderboardRefreshed');
      sessionStorage.removeItem('postLoginRefresh');
      sessionStorage.setItem('wasLoggedOut', 'true');
      
      // Immediate refresh on logout
      console.debug('[Leaderboard] Executing immediate refresh for logout');
      window.location.href = window.location.href;
      return;
    }
    
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
      } else if (status === "unauthenticated") {
        console.debug('[Leaderboard] User is unauthenticated, setting user to null');
        setUser(null);
      } else if (status === "loading") {
        console.debug('[Leaderboard] Session is loading, keeping current user state');
        // Don't change user state while loading
        return;
      } else {
        console.debug('[Leaderboard] Unknown session state, setting user to null. Status:', status, 'Session ID:', session?.user?.id);
        setUser(null);
      }
      setIsLoading(false);
    };

    // Always fetch user when status changes, but handle loading state properly
    fetchUser();
  }, [status, session]); // Remove refreshKey dependency since we're using hard refresh

  // Clear page-specific refresh flag when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('leaderboardRefreshed');
    };
  }, []);

  // Show loading while session is loading or while we're fetching user data
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
  
  // Calculate highlight identifier with debugging
  const highlightIdentifier = currentUser.id === '00000000-0000-0000-0000-000000000000' 
    ? undefined 
    : (currentUser.username || currentUser.wallet);
    
  console.debug('[Leaderboard] Current user state:', {
    user,
    currentUser,
    highlightIdentifier,
    isGuest: currentUser.id === '00000000-0000-0000-0000-000000000000',
    status,
    sessionId: session?.user?.id
  });

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
      <Leaderboard highlightIdentifier={highlightIdentifier} />
    </main>
  );
}
